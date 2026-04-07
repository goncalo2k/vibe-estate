import type { Bindings } from "../bindings.js";
import {
  generateId,
  type SearchRow,
  type PropertyRow,
  rowToProperty,
  type AnalysisRow,
} from "../db/queries.js";

export async function runNotificationJob(env: Bindings): Promise<void> {
  const db = env.DB;

  // Get active searches with notification emails
  const searches = await db
    .prepare(
      "SELECT * FROM searches WHERE is_active = 1 AND notify_email IS NOT NULL"
    )
    .all<SearchRow>();

  for (const search of searches.results) {
    try {
      // Find properties matching this search that haven't been notified yet
      const conditions: string[] = [
        "p.is_active = 1",
        "p.operation = ?",
        `NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.search_id = ? AND n.property_id = p.id
        )`,
      ];
      const params: unknown[] = [search.operation, search.id];

      if (search.min_price_cents) {
        conditions.push("p.price_cents >= ?");
        params.push(search.min_price_cents);
      }
      if (search.max_price_cents) {
        conditions.push("p.price_cents <= ?");
        params.push(search.max_price_cents);
      }
      if (search.min_rooms) {
        conditions.push("p.rooms >= ?");
        params.push(search.min_rooms);
      }
      if (search.max_rooms) {
        conditions.push("p.rooms <= ?");
        params.push(search.max_rooms);
      }
      if (search.min_area_m2) {
        conditions.push("p.area_m2 >= ?");
        params.push(search.min_area_m2);
      }
      if (search.max_area_m2) {
        conditions.push("p.area_m2 <= ?");
        params.push(search.max_area_m2);
      }
      if (search.districts) {
        const districts = JSON.parse(search.districts) as string[];
        if (districts.length > 0) {
          conditions.push(
            `p.district IN (${districts.map(() => "?").join(",")})`
          );
          params.push(...districts);
        }
      }
      if (search.providers) {
        const providers = JSON.parse(search.providers) as string[];
        if (providers.length > 0) {
          conditions.push(
            `p.provider IN (${providers.map(() => "?").join(",")})`
          );
          params.push(...providers);
        }
      }

      const where = `WHERE ${conditions.join(" AND ")}`;
      const newProperties = await db
        .prepare(
          `SELECT p.*, a.rating, a.score FROM properties p
           LEFT JOIN analyses a ON a.property_id = p.id
           ${where}
           ORDER BY p.created_at DESC
           LIMIT 20`
        )
        .bind(...params)
        .all<PropertyRow & { rating: string | null; score: number | null }>();

      if (newProperties.results.length === 0) continue;

      // Build and send email
      const htmlBody = buildEmailHtml(
        search.name,
        newProperties.results.map((r) => ({
          ...rowToProperty(r),
          rating: r.rating,
          score: r.score,
        }))
      );

      await sendEmail(
        env,
        search.notify_email!,
        `[Property Agg] ${newProperties.results.length} new properties for "${search.name}"`,
        htmlBody
      );

      // Record notifications
      for (const prop of newProperties.results) {
        await db
          .prepare(
            "INSERT OR IGNORE INTO notifications (id, search_id, property_id) VALUES (?, ?, ?)"
          )
          .bind(generateId(), search.id, prop.id)
          .run();
      }

      console.log(
        `Sent ${newProperties.results.length} notifications for search "${search.name}"`
      );
    } catch (err) {
      console.error(`Notification job failed for search ${search.id}:`, err);
    }
  }
}

async function sendEmail(
  env: Bindings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  // Try Cloudflare Email Workers binding
  if (env.SEND_EMAIL) {
    try {
      const msg = createMimeMessage(env.NOTIFICATION_EMAIL_FROM, to, subject, htmlBody);
      await env.SEND_EMAIL.send(msg);
      return;
    } catch (err) {
      console.error("Cloudflare Email failed, no fallback configured:", err);
      throw err;
    }
  }

  throw new Error("No email sender configured. Set up SEND_EMAIL binding.");
}

function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  htmlBody: string
) {
  const boundary = `boundary-${crypto.randomUUID()}`;
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  // EmailMessage is a Cloudflare Workers runtime global
  // @ts-expect-error EmailMessage is available at runtime in CF Workers
  const Msg = EmailMessage;
  return new Msg(from, to, new TextEncoder().encode(raw));
}

interface PropertyForEmail {
  id: string;
  title: string;
  url: string;
  price_cents: number;
  price_period: string | null;
  area_m2: number | null;
  rooms: number | null;
  district: string | null;
  municipality: string | null;
  provider: string;
  rating: string | null;
  score: number | null;
}

function buildEmailHtml(searchName: string, properties: PropertyForEmail[]): string {
  const rows = properties
    .map((p) => {
      const price = (p.price_cents / 100).toLocaleString("pt-PT");
      const priceSuffix = p.price_period === "month" ? "/mês" : "";
      const ratingBadge = p.rating
        ? `<span style="background:${ratingColor(p.rating)};color:white;padding:2px 8px;border-radius:4px;font-size:12px">${p.rating.replace("_", " ")}</span>`
        : "";

      return `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:12px">
            <a href="${p.url}" style="color:#1a56db;text-decoration:none;font-weight:600">${p.title}</a>
            <div style="color:#666;font-size:13px;margin-top:4px">
              ${[p.municipality, p.district].filter(Boolean).join(", ")} · ${p.provider}
            </div>
          </td>
          <td style="padding:12px;text-align:right;white-space:nowrap">
            <strong>${price}€${priceSuffix}</strong>
            ${p.area_m2 ? `<br><span style="color:#666;font-size:13px">${p.area_m2} m²</span>` : ""}
            ${p.rooms !== null ? `<br><span style="color:#666;font-size:13px">${p.rooms} quartos</span>` : ""}
          </td>
          <td style="padding:12px;text-align:center">${ratingBadge}</td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#111">New properties for "${searchName}"</h2>
      <p style="color:#666">${properties.length} new listing(s) found</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8f9fa;border-bottom:2px solid #dee2e6">
            <th style="padding:12px;text-align:left">Property</th>
            <th style="padding:12px;text-align:right">Details</th>
            <th style="padding:12px;text-align:center">Rating</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#999;font-size:12px;margin-top:24px">
        Sent by Property Aggregator
      </p>
    </div>`;
}

function ratingColor(rating: string): string {
  switch (rating) {
    case "great_deal": return "#16a34a";
    case "good": return "#2563eb";
    case "fair": return "#d97706";
    case "overpriced": return "#dc2626";
    default: return "#6b7280";
  }
}

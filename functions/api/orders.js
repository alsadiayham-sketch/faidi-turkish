import { json, bad, requireRole, authenticate, readJson } from "./_utils.js";

function rowToOrder(row) {
    let obj = {};
    try { obj = JSON.parse(row.data) || {}; } catch (e) { obj = {}; }
    obj.id = row.id;
    obj.status = row.status;
    obj.createdAt = row.created_at;
    return obj;
}
function newId() { return "o_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// GET /api/orders        -> list, any authenticated user (admin or worker)
// GET /api/orders?id=... -> PUBLIC single-order lookup (order tracking by id)
export async function onRequestGet(context) {
    const id = new URL(context.request.url).searchParams.get("id");
    if (id) {
        const row = await context.env.DB
            .prepare("SELECT id, data, status, created_at FROM orders WHERE id = ?")
            .bind(id)
            .first();
        if (!row) return json({ order: null }, 404);
        return json({ order: rowToOrder(row) });
    }
    const gate = await requireRole(context.request, context.env, null);
    if (gate.error) return gate.error;
    const { results } = await context.env.DB
        .prepare("SELECT id, data, status, created_at FROM orders ORDER BY created_at DESC")
        .all();
    return json({ orders: (results || []).map(rowToOrder) });
}

// POST /api/orders -> PUBLIC (checkout). Stores the order; returns its id.
export async function onRequestPost(context) {
    const body = await readJson(context.request);
    if (!body || typeof body !== "object") return bad(400, "invalid body");
    const id = String(body.id || newId());
    const status = String(body.status || "new");
    const data = { ...body };
    delete data.id;
    delete data.status;
    delete data.createdAt;
    const now = Date.now();
    await context.env.DB
        .prepare("INSERT INTO orders (id, data, status, created_at) VALUES (?, ?, ?, ?)")
        .bind(id, JSON.stringify(data), status, now)
        .run();

    // Best-effort per-size stock decrement (untracked sizes have stock === null and are skipped).
    try {
        await decrementStock(context.env.DB, Array.isArray(body.items) ? body.items : []);
    } catch (e) {
        // Non-fatal: never block an order because stock bookkeeping failed.
    }

    return json({ id, order: { ...data, id, status, createdAt: now } });
}

async function decrementStock(DB, items) {
    for (const item of items) {
        if (!item || item.type === "custom_package") continue;
        const productId = item.productId != null ? String(item.productId) : (item.id != null ? String(item.id) : null);
        if (!productId) continue;
        const qty = Math.max(0, parseInt(item.qty, 10) || 0);
        if (!qty) continue;

        const row = await DB.prepare("SELECT id, data FROM products WHERE id = ?").bind(productId).first();
        if (!row) continue;
        let product;
        try { product = JSON.parse(row.data) || {}; } catch (e) { continue; }
        if (!Array.isArray(product.sizes) || !product.sizes.length) continue;

        let idx = Number(item.sizeIdx);
        if (!(idx >= 0 && idx < product.sizes.length)) idx = -1;
        if (idx < 0 && item.sizeLabel) {
            idx = product.sizes.findIndex(function (s) {
                return s && String(s.size) && item.sizeLabel.indexOf(String(s.size)) === 0;
            });
        }
        if (idx < 0 || idx >= product.sizes.length) continue;

        const size = product.sizes[idx];
        if (!size || size.stock === null || size.stock === undefined || size.stock === "") continue;
        const current = parseInt(size.stock, 10);
        if (isNaN(current)) continue;
        size.stock = Math.max(0, current - qty);

        await DB.prepare("UPDATE products SET data = ?, updated_at = ? WHERE id = ?")
            .bind(JSON.stringify(product), Date.now(), productId)
            .run();
    }
}

// PATCH /api/orders?id=...  body { status } -> any authenticated user
export async function onRequestPatch(context) {
    const gate = await requireRole(context.request, context.env, null);
    if (gate.error) return gate.error;
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return bad(400, "missing id");
    const body = await readJson(context.request);
    if (!body || !body.status) return bad(400, "missing status");
    await context.env.DB
        .prepare("UPDATE orders SET status = ? WHERE id = ?")
        .bind(String(body.status), id)
        .run();
    return json({ ok: true });
}

// DELETE /api/orders?id=... -> admin only
export async function onRequestDelete(context) {
    const gate = await requireRole(context.request, context.env, "admin");
    if (gate.error) return gate.error;
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return bad(400, "missing id");
    await context.env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
    return json({ ok: true });
}

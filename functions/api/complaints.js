import { json, bad, requireRole, readJson } from "./_utils.js";

function rowToComplaint(row) {
    let obj = {};
    try { obj = JSON.parse(row.data) || {}; } catch (e) { obj = {}; }
    obj.id = row.id;
    obj.status = row.status;
    obj.createdAt = row.created_at;
    return obj;
}
function newId() { return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function clean(v, max) {
    return String(v == null ? "" : v).trim().slice(0, max || 2000);
}

// GET /api/complaints -> list, any authenticated user (admin or worker)
export async function onRequestGet(context) {
    const gate = await requireRole(context.request, context.env, null);
    if (gate.error) return gate.error;
    const { results } = await context.env.DB
        .prepare("SELECT id, data, status, created_at FROM complaints ORDER BY created_at DESC")
        .all();
    return json({ complaints: (results || []).map(rowToComplaint) });
}

// POST /api/complaints -> PUBLIC. Stores a customer complaint/feedback.
export async function onRequestPost(context) {
    const body = await readJson(context.request);
    if (!body || typeof body !== "object") return bad(400, "invalid body");
    const message = clean(body.message, 4000);
    if (!message) return bad(400, "empty message");
    const data = {
        name: clean(body.name, 120),
        phone: clean(body.phone, 40),
        type: clean(body.type, 60) || "شكوى",
        message: message
    };
    const id = newId();
    const now = Date.now();
    await context.env.DB
        .prepare("INSERT INTO complaints (id, data, status, created_at) VALUES (?, ?, ?, ?)")
        .bind(id, JSON.stringify(data), "new", now)
        .run();
    return json({ id, complaint: { ...data, id, status: "new", createdAt: now } });
}

// PATCH /api/complaints?id=... body { status } -> any authenticated user
export async function onRequestPatch(context) {
    const gate = await requireRole(context.request, context.env, null);
    if (gate.error) return gate.error;
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return bad(400, "missing id");
    const body = await readJson(context.request);
    if (!body || !body.status) return bad(400, "missing status");
    await context.env.DB
        .prepare("UPDATE complaints SET status = ? WHERE id = ?")
        .bind(String(body.status), id)
        .run();
    return json({ ok: true });
}

// DELETE /api/complaints?id=... -> admin only
export async function onRequestDelete(context) {
    const gate = await requireRole(context.request, context.env, "admin");
    if (gate.error) return gate.error;
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return bad(400, "missing id");
    await context.env.DB.prepare("DELETE FROM complaints WHERE id = ?").bind(id).run();
    return json({ ok: true });
}

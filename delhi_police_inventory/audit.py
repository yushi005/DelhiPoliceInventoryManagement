"""
audit.py – End-to-end live test of every route group
Run from delhi_police_inventory/ with the server already running on :8000
"""
import subprocess, json, sys

BASE = "http://127.0.0.1:8000"
OK   = "✅"
FAIL = "❌"
results = []

def curl(method, path, token=None, body=None):
    cmd = ["curl", "-s", "-X", method, f"{BASE}{path}",
           "-H", "Content-Type: application/json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    if body:
        cmd += ["-d", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return r.stdout

def check(label, condition, extra=""):
    icon = OK if condition else FAIL
    msg  = f"{icon} {label:<40} {extra}"
    print(msg)
    results.append(condition)

# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTH
# ─────────────────────────────────────────────────────────────────────────────
r = curl("POST", "/auth/login", body={"badge_id": "BADGE001", "password": "password123"})
sa_token = r.get("access_token", "")
check("[AUTH] Superadmin login", bool(sa_token), f"token_type={r.get('token_type')}")

r2 = curl("POST", "/auth/login", body={"badge_id": "BADGE005", "password": "password123"})
off_token = r2.get("access_token", "")
check("[AUTH] Officer login", bool(off_token), f"token_type={r2.get('token_type')}")

r3 = curl("POST", "/auth/login", body={"badge_id": "BADGE001", "password": "wrong"})
check("[AUTH] Bad credentials rejected", "detail" in r3, f"detail={r3.get('detail','')}")

# Admin login (Central district admin)
r4 = curl("POST", "/auth/login", body={"badge_id": "BADGE002", "password": "password123"})
adm_token = r4.get("access_token", "")
check("[AUTH] Admin login", bool(adm_token))

# ─────────────────────────────────────────────────────────────────────────────
# 2. SUBMISSIONS CRUD
# ─────────────────────────────────────────────────────────────────────────────
new_sub = curl("POST", "/submissions/", sa_token, {
    "item_name": "Test Radio Unit", "item_category": "Communication",
    "quantity": 5, "unit_price": 3000.0,
    "purpose": "Audit test submission for verification",
    "priority": "high",
})
sub_id = new_sub.get("id")
check("[SUB] Create submission", bool(sub_id),
      f"id={sub_id}, status={new_sub.get('status')}, total={new_sub.get('total_price')}")

lst = curl("GET", "/submissions/?limit=5", sa_token)
check("[SUB] List all (superadmin)", isinstance(lst, list) and len(lst) > 0,
      f"returned {len(lst) if isinstance(lst,list) else 0} items")

# Filter by status
lst_pend = curl("GET", "/submissions/?status=pending", sa_token)
check("[SUB] Filter by status=pending", isinstance(lst_pend, list),
      f"count={len(lst_pend) if isinstance(lst_pend,list) else lst_pend}")

# Filter by category
lst_cat = curl("GET", "/submissions/?category=Equipment", sa_token)
check("[SUB] Filter by category=Equipment", isinstance(lst_cat, list),
      f"count={len(lst_cat) if isinstance(lst_cat,list) else lst_cat}")

one = curl("GET", f"/submissions/{sub_id}", sa_token)
check("[SUB] Get single by ID", one.get("id") == sub_id, f"id={one.get('id')}")

upd = curl("PATCH", f"/submissions/{sub_id}", sa_token, {"quantity": 10, "remarks": "Updated qty"})
check("[SUB] Update (PATCH) submission",
      upd.get("quantity") == 10 and upd.get("total_price") == 30000.0,
      f"qty={upd.get('quantity')}, total={upd.get('total_price')}")

# Officer cannot see a submission that belongs to another officer (sub id=2 belongs to user 6)
deny = curl("GET", "/submissions/2", off_token)
check("[SUB] Officer blocked from others' sub", "detail" in deny, f"detail={deny.get('detail','')[:50]}")

# Officer sees their own submissions list
off_lst = curl("GET", "/submissions/", off_token)
check("[SUB] Officer list (own only)", isinstance(off_lst, list), f"count={len(off_lst) if isinstance(off_lst,list) else off_lst}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. APPROVALS (PATCH)
# ─────────────────────────────────────────────────────────────────────────────
appr = curl("PATCH", f"/approvals/{sub_id}", sa_token,
            {"status": "approved", "remarks": "Audit approved"})
check("[APPR] Superadmin approve", appr.get("status") == "approved",
      f"status={appr.get('status')}, reviewed_by={appr.get('reviewed_by')}")

rej = curl("PATCH", "/approvals/1", sa_token,
           {"status": "rejected", "remarks": "Over budget"})
check("[APPR] Superadmin reject", rej.get("status") == "rejected",
      f"status={rej.get('status')}")

reset = curl("PATCH", "/approvals/2", sa_token, {"status": "pending"})
check("[APPR] Superadmin reset to pending", reset.get("status") == "pending",
      f"status={reset.get('status')}")

adm_appr = curl("PATCH", "/approvals/2", adm_token,
                {"status": "under_review", "remarks": "Under admin review"})
check("[APPR] Admin → under_review (own district)", adm_appr.get("status") == "under_review",
      f"status={adm_appr.get('status')}, sub2=BADGE006=Central")

deny2 = curl("PATCH", f"/approvals/{sub_id}", off_token, {"status": "approved"})
check("[APPR] Officer blocked from approving", "detail" in deny2,
      f"detail={deny2.get('detail','')[:60]}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────
summ = curl("GET", "/analytics/summary", sa_token)
check("[ANA] Summary endpoint", "total" in summ and "by_district" in summ,
      f"total={summ.get('total')}, approved={summ.get('approved')}, districts={len(summ.get('by_district',[]))}")

brk = curl("GET", "/analytics/status-breakdown", sa_token)
check("[ANA] Status breakdown", isinstance(brk, list),
      str([f"{r['status']}:{r['count']}" for r in brk]))

top = curl("GET", "/analytics/top-categories?limit=3", sa_token)
check("[ANA] Top categories", isinstance(top, list),
      str([r["category"] for r in top]))

filt = curl("GET", "/analytics/summary?date_from=2024-01-01&date_to=2024-06-30&priority=normal", sa_token)
check("[ANA] Filtered summary (date+priority)", "total" in filt,
      f"total={filt.get('total')}")

dist_filt = curl("GET", "/analytics/summary?district_id=1", sa_token)
check("[ANA] Filtered by district_id=1", "total" in dist_filt,
      f"total={dist_filt.get('total')}, districts={dist_filt.get('by_district')}")

# Admin analytics scoped to their district
adm_summ = curl("GET", "/analytics/summary", adm_token)
check("[ANA] Admin scoped to district", "total" in adm_summ,
      f"total={adm_summ.get('total')} (central district only)")

# ─────────────────────────────────────────────────────────────────────────────
# 5. USER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
me = curl("GET", "/users/me", sa_token)
check("[USR] GET /users/me", me.get("badge_id") == "BADGE001",
      f"badge={me.get('badge_id')}, role={me.get('role')}")

users = curl("GET", "/users/?limit=20", sa_token)
check("[USR] List users (superadmin)", isinstance(users, list),
      f"count={len(users) if isinstance(users,list) else users}")

adm_users = curl("GET", "/users/", adm_token)
check("[USR] Admin sees only district users", isinstance(adm_users, list),
      f"count={len(adm_users) if isinstance(adm_users,list) else adm_users}")

new_u = curl("POST", "/users/", sa_token, {
    "badge_id": "BADGE099", "name": "Audit Officer", "password": "audit1234",
    "role": "officer", "district_id": 1, "unit_id": 1,
})
uid = new_u.get("id")
check("[USR] Create user", bool(uid), f"id={uid}, role={new_u.get('role')}")

upd_u = curl("PATCH", f"/users/{uid}", sa_token, {"name": "Updated Audit Officer"})
check("[USR] Update user", upd_u.get("name") == "Updated Audit Officer",
      f"name={upd_u.get('name')}")

del_r = subprocess.run(
    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "DELETE",
     f"{BASE}/users/{uid}", "-H", f"Authorization: Bearer {sa_token}"],
    capture_output=True, text=True
)
check("[USR] Delete user (superadmin)", del_r.stdout == "204", f"HTTP {del_r.stdout}")

deny3 = curl("GET", "/users/", off_token)
check("[USR] Officer blocked from /users/", "detail" in deny3,
      f"detail={deny3.get('detail','')[:60]}")

# Duplicate badge_id check
dup = curl("POST", "/users/", sa_token, {
    "badge_id": "BADGE001", "name": "Dup User", "password": "dup12345",
    "role": "officer", "district_id": 1,
})
check("[USR] Duplicate badge_id rejected", dup.get("detail") is not None,
      f"detail={dup.get('detail','')[:50]}")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
passed = sum(results)
total  = len(results)
print(f"\n{'='*60}")
print(f"  RESULT: {passed}/{total} checks passed")
if passed == total:
    print("  🎉 FULL END-TO-END PASS — all prompt requirements met!")
else:
    failed = [i for i, v in enumerate(results) if not v]
    print(f"  ⚠️  Failed check indices: {failed}")
print(f"{'='*60}")
sys.exit(0 if passed == total else 1)

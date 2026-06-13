"""
seed.py — 15 districts, 47 units, 12 users, 25 software submissions
Default password for all users: Delhi@1234
"""
import random
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import (District, Unit, User, Submission,
                    StatusEnum, RoleEnum)
from auth import hash_password

Base.metadata.create_all(bind=engine)

DISTRICTS = [
    "Central", "New Delhi", "North", "North East", "North West",
    "South", "South West", "East", "West", "Dwarka",
    "Rohini", "Shahdara", "Outer", "Outer North", "South East"
]

UNITS = {
    "Central":     ["Connaught Place PS", "Paharganj PS", "Karol Bagh PS"],
    "New Delhi":   ["Parliament Street PS", "Tilak Marg PS", "Chanakyapuri PS"],
    "North":       ["Model Town PS", "Mukherjee Nagar PS", "Shalimar Bagh PS"],
    "North East":  ["Shahdara PS", "Seemapuri PS", "Nand Nagri PS"],
    "North West":  ["Rohini PS", "Pitampura PS", "Sanjay Gandhi Nagar PS"],
    "South":       ["Hauz Khas PS", "Saket PS", "Malviya Nagar PS"],
    "South West":  ["Dwarka PS", "Vasant Kunj PS", "Palam PS"],
    "East":        ["Preet Vihar PS", "Laxmi Nagar PS", "Gandhi Nagar PS"],
    "West":        ["Rajouri Garden PS", "Janakpuri PS", "Punjabi Bagh PS"],
    "Dwarka":      ["Dwarka Sector 10 PS", "Dwarka Sector 23 PS", "Bindapur PS"],
    "Rohini":      ["Rohini Sector 14 PS", "Rohini Sector 18 PS", "Badli PS"],
    "Shahdara":    ["Vivek Vihar PS", "Anand Vihar PS", "Dilshad Garden PS"],
    "Outer":       ["Narela PS", "Bawana PS", "Alipur PS"],
    "Outer North": ["Burari PS", "Timarpur PS", "Samaypur Badli PS"],
    "South East":  ["Lajpat Nagar PS", "Okhla PS", "Badarpur PS"],
}

USERS_SEED = [
    # (badge_id, name, role, rank, district, unit)
    ("DP0001", "Rakesh Mehra",    "superadmin", "Commissioner",  "Central",   "Connaught Place PS"),
    ("DP0002", "Sunita Rao",      "admin",      "DCP",           "Central",   "Connaught Place PS"),
    ("DP0003", "Anil Saxena",     "admin",      "DCP",           "North",     "Model Town PS"),
    ("DP0004", "Kavita Sharma",   "admin",      "DCP",           "South",     "Hauz Khas PS"),
    ("DP0005", "Deepak Yadav",    "officer",    "Inspector",     "Central",   "Paharganj PS"),
    ("DP0006", "Neha Gupta",      "officer",    "SI",            "Central",   "Karol Bagh PS"),
    ("DP0007", "Rajesh Tiwari",   "officer",    "Inspector",     "North",     "Mukherjee Nagar PS"),
    ("DP0008", "Pooja Rawat",     "officer",    "ASI",           "North",     "Shalimar Bagh PS"),
    ("DP0009", "Vikas Mishra",    "officer",    "SI",            "South",     "Saket PS"),
    ("DP0010", "Aman Verma",      "officer",    "Inspector",     "South",     "Malviya Nagar PS"),
    ("DP0011", "Ritu Singh",      "officer",    "ASI",           "East",      "Laxmi Nagar PS"),
    ("DP0012", "Suresh Pandey",   "officer",    "SI",            "West",      "Janakpuri PS"),
]

SOFTWARE_SUBMISSIONS = [
    ("CCTNS Portal",        "in-house",   None,            "2.1",  "Crime and Criminal Tracking Network",        "cloud",   "NIC",         "500GB",  "NIC Data Centre Pune",   "public"),
    ("FIR Management Sys",  "in-house",   None,            "3.0",  "Digital FIR registration and tracking",      "on-prem", None,          "1TB",    "District HQ Server Room", "restrictive"),
    ("Dial 112 CAD",        "vendor",     "Motorola",      "4.2",  "Computer Aided Dispatch for emergency calls","hybrid",  "Motorola",    "2TB",    "Delhi Police HQ",        "restrictive"),
    ("e-Challan System",    "commercial", "NIC",           "1.5",  "Traffic violation e-challan issuance",       "cloud",   "NIC",         "200GB",  "NIC Cloud",              "public"),
    ("ZIPNET",              "in-house",   None,            "5.0",  "Zonal Integrated Police Network",            "on-prem", None,          "5TB",    "PHQ Server Farm",        "confidential"),
    ("Surveillance CCTV",   "vendor",     "Hikvision",     "2.8",  "City-wide CCTV feed aggregation",            "hybrid",  "Hikvision",   "10TB",   "EOC Delhi",              "restrictive"),
    ("HR Management Sys",   "in-house",   None,            "1.2",  "Personnel records and leave management",     "on-prem", None,          "500GB",  "PHQ Admin Block",        "confidential"),
    ("Forensic Lab LIMS",   "vendor",     "LabVantage",    "8.0",  "Lab information for forensic samples",       "on-prem", "LabVantage",  "2TB",    "FSL Rohini",             "confidential"),
    ("Traffic Analytics",   "commercial", "Iteris",        "3.1",  "AI-based traffic flow analytics",            "cloud",   "Iteris",      "1TB",    "Iteris US Cloud",        "public"),
    ("Beat Officer App",    "in-house",   None,            "1.0",  "Mobile app for beat officers field reports", "cloud",   "NIC",         "100GB",  "NIC MeitY Cloud",        "restrictive"),
    ("Jail Management Sys", "vendor",     "SysArc",        "2.3",  "Undertrial and convict management",          "on-prem", "SysArc",      "3TB",    "Tihar Jail Server",      "confidential"),
    ("SCRB Database",       "in-house",   None,            "4.0",  "State Crime Records Bureau data system",     "on-prem", None,          "8TB",    "PHQ SCRB Wing",          "confidential"),
    ("Court Case Tracker",  "commercial", "NIC eCourts",   "2.0",  "Tracking court dates and case status",       "cloud",   "NIC",         "500GB",  "NIC Cloud",              "public"),
    ("Arms License Sys",    "in-house",   None,            "1.8",  "Arms license issuance and renewal tracking", "on-prem", None,          "200GB",  "District License Branch", "restrictive"),
    ("Antecedent Verif",    "in-house",   None,            "2.0",  "Tenant and employee antecedent checks",      "cloud",   "NIC",         "300GB",  "NIC Cloud",              "public"),
    ("SHO Dashboard",       "in-house",   None,            "1.1",  "Station House Officer daily reporting tool", "on-prem", None,          "100GB",  "PS Server",              "restrictive"),
    ("Cyber Crime Portal",  "vendor",     "C-DAC",         "3.5",  "Cyber crime complaint intake and tracking",  "cloud",   "C-DAC",       "1TB",    "C-DAC Pune Cloud",       "public"),
    ("Witness Protection",  "in-house",   None,            "1.0",  "Secure witness identity and location mgmt",  "on-prem", None,          "500GB",  "Classified Location",    "confidential"),
    ("PCR Van Tracking",    "vendor",     "MapmyIndia",    "2.2",  "Real-time GPS tracking of PCR fleet",        "cloud",   "MapmyIndia",  "200GB",  "MapmyIndia Cloud",       "restrictive"),
    ("Missing Persons DB",  "in-house",   None,            "3.0",  "Missing persons registry and photo matching","cloud",   "NIC",         "2TB",    "NIC Cloud",              "public"),
    ("VIP Security App",    "in-house",   None,            "1.5",  "VIP movement and security coordination",     "on-prem", None,          "100GB",  "SPG Coord Server",       "confidential"),
    ("Drug Seizure Reg",    "in-house",   None,            "2.1",  "Narcotics seizure logging and tracking",     "on-prem", None,          "500GB",  "ANC Server Room",        "confidential"),
    ("e-Prosecution Sys",   "commercial", "NIC",           "1.3",  "Digital chargesheet and prosecution mgmt",  "cloud",   "NIC",         "1TB",    "NIC Cloud",              "restrictive"),
    ("Riot Control Coord",  "in-house",   None,            "1.0",  "Crowd and riot situation coordination tool", "on-prem", None,          "200GB",  "PHQ Ops Room",           "confidential"),
    ("Community Policing",  "commercial", "Salesforce",    "4.0",  "Citizen grievance and community engagement", "cloud",   "Salesforce",  "500GB",  "Salesforce Cloud",       "public"),
]

STATUSES = [StatusEnum.pending]*8 + [StatusEnum.approved]*10 + [StatusEnum.rejected]*7


def seed():
    db = SessionLocal()
    try:
        if db.query(District).count() > 0:
            print("Already seeded. Skipping.")
            return

        # Districts
        district_map = {}
        for name in DISTRICTS:
            d = District(name=name)
            db.add(d); db.flush()
            district_map[name] = d

        # Units
        unit_map = {}
        for d_name, unit_names in UNITS.items():
            for u_name in unit_names:
                u = Unit(name=u_name, district_id=district_map[d_name].id)
                db.add(u); db.flush()
                unit_map[u_name] = u

        # Users
        user_objs = []
        for badge_id, name, role, rank, d_name, u_name in USERS_SEED:
            u = User(
                badge_id=badge_id, name=name,
                password_hash=hash_password("Delhi@1234"),
                role=RoleEnum(role), rank=rank,
                district_id=district_map[d_name].id,
                unit_id=unit_map[u_name].id,
            )
            db.add(u); db.flush()
            user_objs.append(u)

        officers = [u for u in user_objs if u.role == RoleEnum.officer]
        admins   = [u for u in user_objs if u.role in (RoleEnum.admin, RoleEnum.superadmin)]

        random.seed(42)
        random.shuffle(STATUSES)
        base_date = datetime(2024, 6, 1)

        for i, (app_name, app_type, vendor, version, purpose,
                srv_type, srv_provider, srv_cap, phys_loc, data_type) in enumerate(SOFTWARE_SUBMISSIONS):
            officer = officers[i % len(officers)]
            status = STATUSES[i]
            created_at = base_date + timedelta(days=random.randint(0, 200))
            reviewer = random.choice(admins) if status != StatusEnum.pending else None

            sub = Submission(
                user_id=officer.id,
                status=status,
                rejection_reason="Budget not allocated this quarter." if status == StatusEnum.rejected else None,
                approved_by=reviewer.id if status == StatusEnum.approved else None,
                rejected_by=reviewer.id if status == StatusEnum.rejected else None,
                status_changed_at=created_at + timedelta(days=2) if status != StatusEnum.pending else None,
                created_at=created_at,
                updated_at=created_at + timedelta(hours=random.randint(1, 48)),
                app_name=app_name,
                app_type=app_type,
                vendor_name=vendor,
                version=version,
                purpose=purpose,
                district_id=officer.district_id,
                unit_id=officer.unit_id,
                storage_location=phys_loc,
                device_config="Windows Server 2019, 32GB RAM, 8-core CPU",
                custodian_name=officer.name,
                custodian_badge_id=officer.badge_id,
                num_users=random.randint(5, 500),
                server_type=srv_type,
                server_provider=srv_provider,
                server_capacity=srv_cap,
                physical_location=phys_loc,
                data_type=data_type,
                data_justification=f"Required classification based on sensitivity of {app_name} data.",
            )
            db.add(sub)

        db.commit()
        print("Seed complete. All users: badge DP0001–DP0012, password: Delhi@1234")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
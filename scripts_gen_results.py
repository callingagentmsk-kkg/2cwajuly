import json, random

random.seed(42)

first_names = ["Aarav","Rohit","Priya","Sneha","Aman","Kunal","Pooja","Ravi","Neha","Suraj",
               "Ankit","Divya","Rahul","Simran","Vikash","Anjali","Saurabh","Kavita","Manish","Ritu",
               "Abhay","Nisha","Gaurav","Shreya","Vivek","Muskan","Deepak","Komal","Rajesh","Payal",
               "Sandeep","Anamika","Karan","Sonam","Amit","Preeti","Vishal","Rekha","Sunil","Alka"]

last_names = ["Kumar","Kumari","Singh","Sharma","Verma","Yadav","Gupta","Prasad","Mishra","Thakur","Rai","Chaudhary"]

classes = ["9","10","11","12"]
test_names = ["Weekly Test 1", "Weekly Test 2", "Weekly Test 3"]

def rand_mobile():
    return "9" + "".join([str(random.randint(0,9)) for _ in range(9)]) if random.random()<0.4 else \
           "8" + "".join([str(random.randint(0,9)) for _ in range(9)]) if random.random()<0.6 else \
           "7" + "".join([str(random.randint(0,9)) for _ in range(9)]) if random.random()<0.8 else \
           "6" + "".join([str(random.randint(0,9)) for _ in range(9)])

def grade(pct):
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B+"
    if pct >= 60: return "B"
    if pct >= 50: return "C"
    return "D"

used_mobiles = set()
students = []

for cls in classes:
    for i in range(10):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        while True:
            mobile = rand_mobile()
            if mobile not in used_mobiles:
                used_mobiles.add(mobile)
                break
        tests = []
        for tname in test_names:
            phy = random.randint(14, 25)
            chem = random.randint(14, 25)
            maths = random.randint(14, 25)
            total = phy + chem + maths
            pct = round(total/75*100, 1)
            tests.append({
                "testName": tname,
                "date": random.choice(["2026-06-06","2026-06-13","2026-06-20","2026-06-27"]),
                "physics": phy,
                "chemistry": chem,
                "maths": maths,
                "total": total,
                "outOf": 75,
                "percentage": pct,
                "grade": grade(pct)
            })
        students.append({
            "name": name,
            "class": cls,
            "mobile": mobile,
            "tests": tests
        })

with open('/home/user/webapp/data/results.json', 'w') as f:
    json.dump({"students": students}, f, indent=2)

# Also write as JS file for direct embedding (no fetch/CORS issues on file:// preview)
with open('/home/user/webapp/js/results-data.js', 'w') as f:
    f.write("// Auto-generated weekly test result demo data for CWA SCIENCE CLASSES\n")
    f.write("const RESULTS_DATA = ")
    f.write(json.dumps({"students": students}, indent=2))
    f.write(";\n")

print("Total students:", len(students))

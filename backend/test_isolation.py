import requests
import uuid
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_isolation():
    # 1. Simulate two different files
    file_id_a = str(uuid.uuid4())
    file_id_b = str(uuid.uuid4())
    
    print(f"Testing with File A: {file_id_a}")
    print(f"Testing with File B: {file_id_b}")

    # 2. Create Report for File A
    print("\n[Step 1] Creating Report for File A...")
    payload_a = {"title": "Report for A", "file_id": file_id_a}
    res_a = requests.post(f"{BASE_URL}/reports", json=payload_a)
    if res_a.status_code != 200:
        print(f"FAILED to create report A: {res_a.text}")
        sys.exit(1)
    report_id_a = res_a.json()["report_id"]
    print(f"SUCCESS: Created Report A ({report_id_a})")

    # 3. Create Report for File B
    print("\n[Step 2] Creating Report for File B...")
    payload_b = {"title": "Report for B", "file_id": file_id_b}
    res_b = requests.post(f"{BASE_URL}/reports", json=payload_b)
    if res_b.status_code != 200:
        print(f"FAILED to create report B: {res_b.text}")
        sys.exit(1)
    report_id_b = res_b.json()["report_id"]
    print(f"SUCCESS: Created Report B ({report_id_b})")

    # 4. Verify List Scope for A
    print("\n[Step 3] verifying List Scope for A...")
    list_a = requests.get(f"{BASE_URL}/reports?file_id={file_id_a}").json()
    report_ids_a = [r["report_id"] for r in list_a]
    
    if report_id_a in report_ids_a and report_id_b not in report_ids_a:
        print("PASS: File A sees its own report and NOT File B's.")
    else:
        print(f"FAIL: Leakage detected in List A! Got: {report_ids_a}")
        sys.exit(1)

    # 5. Verify List Scope for B
    print("\n[Step 4] verifying List Scope for B...")
    list_b = requests.get(f"{BASE_URL}/reports?file_id={file_id_b}").json()
    report_ids_b = [r["report_id"] for r in list_b]
    
    if report_id_b in report_ids_b and report_id_a not in report_ids_b:
        print("PASS: File B sees its own report and NOT File A's.")
    else:
        print(f"FAIL: Leakage detected in List B! Got: {report_ids_b}")
        sys.exit(1)

    print("\n✅ DATA ISOLATION VERIFIED!")

if __name__ == "__main__":
    test_isolation()

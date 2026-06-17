frontend.
- make the frontend mobile first adjust every section, make them tighter and well optimized for mobile.

- increase website load speed

- include thes in the eligibility form
PERSONAL INFORMATION

1. Full Name

2. Email Address

3. WhatsApp Number (with country code)

4. Nationality

APPLICATION DETAILS

5. Destination Country

* Canada
* UK
* USA
* Germany
* Ireland
* France
* Other

6. Visa Type

* Student Visa
* Work Visa
* Tourist Visa
* Other

7. Intended Application Date

* Within 30 Days
* 1–3 Months
* 3–6 Months
* More Than 6 Months

PROOF OF FUNDS REQUIREMENTS

8. Do you already know the Proof of Funds amount required?

* Yes
* No

9. If Yes, what amount is required?
   (Open text field)


11. Have you received any of the following?

* School Admission Letter
* CAS Letter
* Job Offer Letter
* Invitation Letter
* None Yet

12. Do you currently have access to the required funds?

* Yes, fully
* Partially
* No

QUALIFICATION QUESTIONS

13. Are you actively preparing your application for submission within the next 30 days?

* Yes
* No

14. Have you ever had a visa refusal before?

* Yes
* No

15. How did you hear about us?

* Facebook
* Instagram
* TikTok
* Google
* Referral
* Other

16. Additional Information
    (Optional text box)



backend
- im using supabase so i have provided the connection url in the .env file and there is a code in the database folder about the pool connection.
- Implement rate limitter.
- create the routes for health ( for backend wakeup,  for db wakeup)
here the example routes
 app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/borderlessbridgeheart", async (_req, res) => {
    try {
      await pool.query(
        "UPDATE borderlessbridgeheart SET last_ping = CURRENT_TIMESTAMP, counter = counter + 1 WHERE id = 1"
      );
      res.status(200).json({ status: "alive", heart: "beating" });
    } catch (err) {
      logger.error("BorderlessBridgeHeart check failed", err);
      res.status(500).json({ error: "Heartbeat failed" });
    }
  });
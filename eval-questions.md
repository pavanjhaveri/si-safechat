# SI SafeChat — Eval question set v1 (2026-10-07)

Source: one.com help article "Frequently asked questions about Stripe"
(https://help.one.com/hc/en-us/articles/115005585049-Frequently-asked-questions-about-Stripe).
Answers paraphrased from the article; verified 2026-10-07.

Purpose: threshold-calibration harness (tune the 0.65 starting guess), faithfulness
spot-checks (answer stays inside cited chunks), and guardrail probes (the
"No matching information found" short-circuit path).

## Grounded questions (expected: answered with chunk citations)

1. Q: What is Stripe, and what does it let merchants do in the one.com Online Shop?
   A: Stripe is a third-party payment service that lets merchants accept credit/debit
   card payments in their one.com Online Shop; described as secure and fast with
   near-immediate processing.
2. Q: Do shoppers need their own Stripe account to check out?
   A: No — shoppers only need a valid credit or debit card bearing the Visa or
   Mastercard logo.
3. Q: What does the article say about Stripe's security and PCI compliance?
   A: Stripe follows the industry's strictest security requirements and is certified
   as a PCI Level 1 Service Provider.
4. Q: Is SSL provided for the Online Shop?
   A: Yes — the one.com Online Shop is served over SSL through the site built with
   Website Builder.
5. Q: How quickly can a merchant start accepting payments after connecting Stripe?
   A: Immediately upon connecting; Stripe handles all transactions.
6. Q: How do payouts to the merchant's bank account work?
   A: Payouts follow a schedule set in the Stripe dashboard (changeable in Settings),
   with a transfer overview in the dashboard; most banks process only on business
   days, so transfers may take a few extra days.
7. Q: What fraud-prevention measures does the article mention?
   A: Stripe detects suspicious activity and rejects transactions such as repeated
   orders, and cooperates with global partners and credit card networks to monitor
   fraud.
8. Q: Who handles purchase disputes?
   A: one.com takes no responsibility; all disputes are handled directly by Stripe.
9. Q: Which currencies are supported, and are there conversion fees?
   A: Generally the currency of the merchant's country, also depending on the
   connected bank account's location; Stripe charges a conversion fee (varies, about
   2% above regular transaction fees) for charges in a currency not associated with
   the bank account — avoidable by connecting a bank account from the country whose
   currency is used.
10. Q: What are Stripe's fees, and does one.com charge extra for using Stripe?
    A: An up-to-date fee overview is on Stripe's website; one.com charges nothing
    extra (Stripe is included in the Online Shop subscription); Stripe charges a
    per-transaction fee, and certain payment methods carry a monthly subscription fee.
11. Q: Do refunds cost the merchant anything?
    A: No — refunds are free with Stripe.
12. Q: What should a merchant do about an "account already exists" error when
    connecting Stripe?
    A: Contact support@stripe.com.
13. Q: How do you disconnect the Stripe account from the Online Shop?
    A: Control Panel > Online Shop > Settings > Payment options > Edit > Disconnect
    Stripe.

## Unanswerable probes (expected: "No matching information found in the loaded content.")

U1. Q: Does Stripe support cryptocurrency payments?
U2. Q: What is one.com's customer support phone number?

Neither topic is covered by the article. These verify the similarity-threshold
short-circuit fires instead of the LLM hallucinating an answer.

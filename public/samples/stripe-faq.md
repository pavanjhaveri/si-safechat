# Sample: Stripe payments FAQ

> Demo snapshot for trying SI SafeChat. Based on: [Frequently asked questions about Stripe](https://help.one.com/hc/en-us/articles/115005585049-Frequently-asked-questions-about-Stripe) · Snapshot: October 2026 · Paraphrased demo content — read the original article for authoritative answers.

## What is Stripe?

Stripe is a payment service provider that lets merchants accept card payments in an online shop. In the one.com Online Shop, Stripe is offered as a built-in payment method alongside options like PayPal, so shop owners can take payments without building their own checkout infrastructure.

## Do shoppers need a Stripe account?

No. Shoppers pay directly by card at checkout and do not need their own Stripe account. Only the merchant connects a Stripe account to receive the money.

## How secure are Stripe payments?

Stripe is certified as PCI DSS compliant, which is the payment industry's security standard for handling card data. Card details are processed on Stripe's side, so sensitive numbers never touch the merchant's own servers.

## Is SSL included?

Yes. The one.com Online Shop includes an SSL certificate, so the checkout connection between the shopper's browser and the shop is encrypted.

## How fast can a merchant start accepting payments?

Connecting Stripe is quick: the merchant authorizes the connection from the shop's admin panel, and payments can typically be accepted soon after the Stripe account is verified.

## How do payouts work?

Money collected through Stripe is paid out to the merchant's linked bank account on a rolling schedule (for example, a few business days after each charge, depending on the country). Payout timing is controlled by Stripe's settings for the merchant's account.

## What fraud prevention exists?

Stripe provides built-in fraud screening (including its Radar product on eligible plans), plus standard checks like CVC verification and address checks. Merchants can also review flagged payments manually in the Stripe dashboard.

## Who handles disputes?

Purchase disputes (chargebacks) are handled through Stripe. The merchant is notified, can submit evidence, and Stripe mediates the process with the card networks.

## Which currencies are supported?

Stripe supports charging in many currencies. If the payout currency differs from the charge currency, Stripe applies a currency conversion fee on top of the standard transaction fee.

## What are the fees?

Stripe charges a per-transaction fee (a percentage plus a small fixed amount, varying by country and card type). one.com does not add an extra fee for using Stripe as the payment method — the merchant only pays Stripe's own fees.

## Do refunds cost the merchant?

Issuing a refund through Stripe is free in the sense that Stripe does not charge an extra refund fee, but the original transaction fee is generally not returned to the merchant.

## What if connecting shows "account already exists"?

This error means the email address is already tied to a Stripe account. The fix is to log in with the existing Stripe credentials (or recover that account) rather than creating a duplicate, then complete the connection.

## How do you disconnect Stripe?

In the shop's admin panel, the merchant can disconnect the Stripe account from the payment settings. After disconnecting, Stripe will no longer be offered at checkout, and any pending payouts still settle through Stripe.

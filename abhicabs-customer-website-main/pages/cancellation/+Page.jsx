import React from "react";
import LegalLayout from "../../src/components/LegalLayout";

export default function Page() {
  return (
    <LegalLayout title="Cancellation & Refund Policy">
      <h2>1. Free Cancellation Window</h2>
      <p>You can cancel any booking free of charge up to 1 hour before the scheduled pickup time. Any amount already paid will be refunded in full.</p>

      <h2>2. Late Cancellations</h2>
      <p>Cancellations made within 1 hour of the scheduled pickup time may attract a partial cancellation fee to cover driver allocation costs. The applicable fee, if any, is shown before you confirm the cancellation.</p>

      <h2>3. Driver No-Show</h2>
      <p>If your driver does not arrive within a reasonable time of the scheduled pickup, you may cancel free of charge and receive a full refund, or ask our support team to arrange a replacement vehicle.</p>

      <h2>4. Refund Timelines</h2>
      <ul>
        <li>UPI and card refunds are typically processed within 5–7 business days</li>
        <li>Net banking refunds may take 7–10 business days depending on your bank</li>
        <li>Cash payments are not applicable for refunds since payment is made after the trip</li>
      </ul>

      <h2>5. How to Cancel</h2>
      <p>Go to <a href="/my-booking">My Booking</a>, find your trip, and select Cancel Booking. You can also contact our support team with your Booking ID.</p>

      <h2>6. Trip Modifications</h2>
      <p>Changing your pickup time, date, or drop location is treated as a modification rather than a cancellation and does not incur a cancellation fee, subject to driver and cab availability.</p>

      <h2>7. Contact</h2>
      <p>For cancellation or refund queries, reach us through <a href="/#contact-form">Contact &amp; Support</a>.</p>
    </LegalLayout>
  );
}

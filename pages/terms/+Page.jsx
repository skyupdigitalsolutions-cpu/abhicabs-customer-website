import React from "react";
import LegalLayout from "../../src/components/LegalLayout";

export default function Page() {
  return (
    <LegalLayout title="Terms & Conditions">
      <h2>1. Acceptance of Terms</h2>
      <p>By booking a ride through Abhi Cabs, you agree to these Terms &amp; Conditions and our Privacy Policy. If you do not agree, please do not use our services.</p>

      <h2>2. Bookings</h2>
      <ul>
        <li>Fares shown at the time of booking are estimates based on the details you provide; final fares may vary with route changes, waiting time or additional stops</li>
        <li>Booking confirmation is sent once payment (or a valid payment method) is verified</li>
        <li>You are responsible for providing accurate pickup, drop and contact details</li>
      </ul>

      <h2>3. Driver Conduct</h2>
      <p>All drivers are expected to follow traffic laws and treat passengers respectfully. Please report any concerns immediately through Contact &amp; Support.</p>

      <h2>4. Passenger Responsibilities</h2>
      <ul>
        <li>Be ready at the pickup location at the scheduled time</li>
        <li>Do not carry prohibited or illegal items in the vehicle</li>
        <li>Treat the vehicle and driver with respect</li>
      </ul>

      <h2>5. Payments</h2>
      <p>We accept UPI, cards, net banking and, where supported, cash. All applicable taxes are included in the fare shown at checkout unless stated otherwise.</p>

      <h2>6. Cancellations &amp; Refunds</h2>
      <p>Please see our <a href="/cancellation">Cancellation &amp; Refund Policy</a> for full details on cancellation windows and refund timelines.</p>

      <h2>7. Limitation of Liability</h2>
      <p>Abhi Cabs is not liable for delays caused by traffic, weather, or events outside our reasonable control. We will make reasonable efforts to notify you of any expected delays.</p>

      <h2>8. Changes to These Terms</h2>
      <p>We may update these terms from time to time. Continued use of our services after changes means you accept the updated terms.</p>

      <h2>9. Contact</h2>
      <p>Questions about these terms can be sent to <a href="mailto:support@abhicabs.in">support@abhicabs.in</a>.</p>
    </LegalLayout>
  );
}

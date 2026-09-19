import React from "react";
import LegalLayout from "../../src/components/LegalLayout";

export default function Page() {
  return (
    <LegalLayout title="Privacy Policy">
      <h2>1. Introduction</h2>
      <p>Abhi Cabs ("we", "us", "our") respects your privacy. This policy explains what information we collect when you use our website and booking services, how we use it, and the choices you have.</p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li>Contact details you provide, such as name, mobile number and email address</li>
        <li>Trip details, including pickup and drop locations, dates and times</li>
        <li>Payment status shared by our payment partners (we do not store full card details)</li>
        <li>Device and usage information such as browser type and pages visited</li>
        <li>Location data, only while an active trip is being tracked</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To process and confirm your bookings</li>
        <li>To assign drivers and share trip details with them</li>
        <li>To provide customer support and respond to enquiries</li>
        <li>To send booking confirmations, receipts and trip updates</li>
        <li>To improve our services and website experience</li>
      </ul>

      <h2>4. Sharing of Information</h2>
      <p>We share only the information necessary to complete your trip with drivers, and with payment and communication partners strictly to process payments and send notifications. We do not sell personal information to third parties.</p>

      <h2>5. Data Retention</h2>
      <p>We retain booking and trip information for as long as needed to provide support, meet legal requirements, and resolve disputes.</p>

      <h2>6. Your Choices</h2>
      <p>You can request access to, correction of, or deletion of your personal information by contacting us at <a href="mailto:support@abhicabs.in">support@abhicabs.in</a>.</p>

      <h2>7. Contact Us</h2>
      <p>For any privacy-related questions, reach us via our <a href="/#contact">Contact &amp; Support</a> page.</p>
    </LegalLayout>
  );
}

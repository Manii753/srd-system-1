I need you to create a cloud function (or appropriate backend code) that sends automated emails via SMTP when SRD (Service Request Document) events occur in my system.
SMTP Configuration:

Email: followup@lazienda.com.pk
Password: [YOUR_PASSWORD_HERE]
Host: mail.lazienda.com.pk
Port: 465 (SSL encryption)

Requirements:

Database Structure:

I have a "users" collection where each user document contains an "email" field
I have an "srd" collection (or similar) that tracks Service Request Documents


Email Triggers:
Send emails to ALL users in the users collection when:

An SRD is completed (status changes to "completed")
An SRD is changed/updated (any field modification)


Implementation Needs:

Use Node.js with Nodemailer library (or Python with smtplib if you prefer Python)
Connect to the SMTP server using SSL on port 465
Fetch all user emails from the users collection
Send appropriate email notifications based on the trigger type
Include error handling for failed email sends
Log successful and failed email attempts


Email Content:

For completed SRDs: Subject should indicate completion, body should include SRD details
For updated SRDs: Subject should indicate update, body should show what changed
Include SRD ID, title/description, and relevant timestamp in the email body


Code Structure:
Please provide:

Complete cloud function code (Firebase/Google Cloud Functions format preferred)
Database query to fetch all user emails
SMTP configuration and connection code
Email template formatting
Proper error handling and logging


Additional Considerations:

Handle bulk email sending efficiently
Avoid rate limiting issues
Ensure emails don't go to spam (proper headers, from address)
Make email templates professional and readable



Please generate the complete, production-ready code with comments explaining each section.
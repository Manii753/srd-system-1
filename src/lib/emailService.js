import nodemailer from 'nodemailer';
import User from '@/models/User';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'mail.lazienda.com.pk',
  port: 465,
  secure: true, 
  auth: {
    user: 'followup@lazienda.com.pk',
    pass: process.env.SMTP_PASSWORD, 
  },
});

/**
 * Fetches all user emails from the database.
 * @returns {Promise<string[]>} Array of email addresses
 */
async function getAllUserEmails() {
  try {
    const users = await User.find({ isActive: true }, 'email');
    console.log(`Found ${users.length} active users`); // Only active users
    const emails = users.map(user => user.email).filter(email => email);
    console.log(`Valid emails: ${emails.length}`); 
    return emails;
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return [];
  }
}

/**
 * Sends an email using the configured transporter.
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
async function sendEmail(to, subject, html) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('No recipients for email:', subject);
    return;
  }

  const mailOptions = {
    from: '"La Zinda SRD System" <followup@lazienda.com.pk>',
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * Formats the changes object for the email body.
 * @param {Object} changes - The object containing changed fields
 * @returns {string} HTML string describing changes
 */
function formatChanges(changes) {
  if (!changes) return 'Details updated.';
  
  // Exclude internal fields or large objects if needed
  const ignoredFields = ['updatedAt', '_id', '__v'];
  
  let html = '<ul>';
  for (const [key, value] of Object.entries(changes)) {
    if (ignoredFields.includes(key)) continue;
    
    let displayValue = value;
    if (typeof value === 'object') {
       displayValue = JSON.stringify(value, null, 2);
    }
    html += `<li><strong>${key}:</strong> ${displayValue}</li>`;
  }
  html += '</ul>';
  
  if (html === '<ul></ul>') return 'Details updated.';
  return html;
}

/**
 * Notifies all users that a new SRD has been created.
 * @param {Object} srd - The newly created SRD document
 */
export async function notifySRDCreation(srd) {
  const emails = await getAllUserEmails();
  
  const subject = `New SRD Created: ${srd.refNo}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>New SRD Created</h2>
      <p>A new Service Request Document has been created.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
        <p><strong>Ref No:</strong> ${srd.refNo}</p>
        <p><strong>Title:</strong> ${srd.title || 'N/A'}</p>
        <p><strong>Description:</strong> ${srd.description || 'N/A'}</p>
        <p><strong>Created At:</strong> ${new Date(srd.createdAt || Date.now()).toLocaleString()}</p>
      </div>
      
      <p>Please log in to the system to view full details.</p>
    </div>
  `;

  await sendEmail(emails, subject, html);
}

/**
 * Notifies all users that an SRD has been completed.
 * @param {Object} srd - The SRD document
 */
export async function notifySRDCompletion(srd) {
  const emails = await getAllUserEmails();
  
  const subject = `SRD Completed: ${srd.refNo} - ${srd.title || 'Untitled'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>SRD Completed</h2>
      <p>The following Service Request Document has been marked as <strong>Completed</strong>.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
        <p><strong>Ref No:</strong> ${srd.refNo}</p>
        <p><strong>Title:</strong> ${srd.title || 'N/A'}</p>
        <p><strong>Description:</strong> ${srd.description || 'N/A'}</p>
        <p><strong>Completion Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>Please log in to the system to view full details.</p>
    </div>
  `;

  await sendEmail(emails, subject, html);
}

/**
 * Notifies all users that an SRD has been updated.
 * @param {Object} srd - The updated SRD document
 * @param {Object} changes - The fields that were changed
 */
export async function notifySRDUpdate(srd, changes) {
  const emails = await getAllUserEmails();
  
  const subject = `SRD Updated: ${srd.refNo} - ${srd.title || 'Untitled'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>SRD Updated</h2>
      <p>The following Service Request Document has been updated.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
        <p><strong>Ref No:</strong> ${srd.refNo}</p>
        <p><strong>Title:</strong> ${srd.title || 'N/A'}</p>
        <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Changes:</h3>
        ${formatChanges(changes)}
      </div>
      
      <p>Please log in to the system to view full details.</p>
    </div>
  `;

  await sendEmail(emails, subject, html);
}

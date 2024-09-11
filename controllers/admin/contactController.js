import mjml2html from 'mjml';
import nodemailer from 'nodemailer';
import adminModel from '../../model/adminSchema.js';
import { UsersModel } from '../../model/usersSchema.js'; // Ensure you're importing correctly

export const sendContactEmail = async (req, res) => {
  const { email, firstName, lastName, companyName, phoneNumber, message } = req.body;
  try {
    // Fetch user data from the database using email
    const user = await UsersModel.findOne({ 'users.email': email }, { 'users.$': 1 });

    const foundUser = user?.users?.[0] || {}; // Extract the user from the array

    // Use user data if available, otherwise use form data
    const finalFirstName = firstName || foundUser?.userName;
    const finalPhoneNumber = phoneNumber || foundUser?.contact;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'aurifycontact@gmail.com', // Replace with your company's email
      cc: email, //for admins to get email copy 
      subject: 'New Contact Form Submission',
      attachments: [{
        filename: 'logo.png',
        path: 'public/logo.png',
        cid: 'Logo' //same cid value as in the html img src
      }],
      html: mjml2html(
        `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Helvetica, Arial, sans-serif" color="#55575d" />
      <mj-class name="header" font-size="18px" color="#ffffff" font-weight="bold" />
      <mj-class name="footer" font-size="14px" color="#bbbbbb" />
    </mj-attributes>
    <mj-style inline="inline">
      .bg-gradient {
        background: linear-gradient(to right, #0a1f44, #1e3a8a);
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f5f5f5">
    <!-- Header Section -->
    <mj-section css-class="bg-gradient" padding="15px 20px">
      <mj-column width="100%" vertical-align="middle">
        <mj-image src="cid:Logo" alt="Aurify Logo" width="80px" align="center" />
        <mj-text mj-class="header" align="center" padding-top="5px">Aurify</mj-text>
      </mj-column>
    </mj-section>

    <!-- Main Content Section -->
    <mj-section background-color="#ffffff" padding="20px" border-radius="8px" css-class="shadow">
      <mj-column>
        <mj-divider border-width="2px" border-color="#1e3a8a" />
        <mj-text font-size="16px" color="#333333" line-height="1.8em" padding="10px 0">
          <strong>Name:</strong> ${finalFirstName} ${lastName} <br />
          <strong>Company:</strong> ${companyName} <br />
          <strong>Email:</strong> ${email} <br />
          <strong>Phone:</strong> ${finalPhoneNumber} <br />
          <strong>Message:</strong> ${message}
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Footer Section -->
    <mj-section background-color="#0a1f44" padding="10px">
      <mj-column>
        <mj-text mj-class="footer" align="center">
          Aurify Support Team<br />
          Email: support@aurify.com<br />
          Phone: +123 456 7890
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
      ).html
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
};



//Additoinal features 
export const sendFeatureRequestEmail = async (req, res) => {
  const {  email, feature,  } = req.body;
  
  try {
    const user = await adminModel.findOne({ email });
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || "aurifycontact@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "hnrgcobxcinqbuae",
      },
    });

    const mailOptions = {
      from: email ,// Origin email will be constant 
      to: 'aurifycontact@gmail.com', // Replace with your company's email
      cc: email, //for admins to get email copy
      subject: 'New Feature Request',
      attachments: [{
        filename: 'logo.png',
        path: 'public/logo.png',
        cid: 'Logo' // same cid value as in the HTML img src
      }],
      html: mjml2html(`
        <mjml>
          <mj-head>
            <mj-attributes>
              <mj-text font-family="Helvetica, Arial, sans-serif" color="#55575d" />
              <mj-class name="header" font-size="28px" color="#ffffff" font-weight="bold" />
              <mj-class name="footer" font-size="14px" color="#bbbbbb" />
            </mj-attributes>
            <mj-style inline="inline">
              .bg-gradient {
                background: linear-gradient(to right, #0a1f44, #1e3a8a);
              }
            </mj-style>
          </mj-head>
          <mj-body background-color="#f5f5f5">
            <!-- Header Section -->
            <mj-section css-class="bg-gradient" padding="20px">
              <mj-column>
                <mj-image src="cid:Logo" alt="Aurify Logo" width="150px" />
                <mj-text mj-class="header" align="center" padding-top="10px">Aurify - New Feature Request</mj-text>
              </mj-column>
            </mj-section>

            <!-- Main Content Section -->
            <mj-section background-color="#ffffff" padding="20px">
              <mj-column>
                <mj-divider border-width="2px" border-color="#1e3a8a" />
                <mj-text font-size="16px" color="#333333" line-height="1.8em" padding="10px 0">
                  <strong>Name:</strong> ${user.userName} <br />
                  <strong>User Email:</strong> ${email} <br />
                  <strong>Phone:</strong> ${user.contact} <br />
                  <strong>Address:</strong> ${user.address} <br />
                  <strong>Requested Feature:</strong> ${feature} <br />
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Footer Section -->
            <mj-section background-color="#0a1f44" padding="10px">
              <mj-column>
                <mj-text mj-class="footer" align="center">
                  Aurify Support Team<br />
                  Email: support@aurify.com<br />
                  Phone: +123 456 7890
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `).html
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: true,
      message: 'Feature request email sent successfully'
    });
  } catch (error) {
    console.error('Error in sendFeatureRequestEmail:', error);
    res.status(500).json({ success: false, message: 'Error sending feature request email', error: error.message });
  }
};

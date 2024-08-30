import mjml2html from 'mjml';
import nodemailer from 'nodemailer';
import { UsersModel } from '../../model/usersSchema.js'; // Ensure you're importing correctly

export const sendContactEmail = async (req, res) => {
  const { email, firstName, lastName, companyName, phoneNumber, message } = req.body;
  try {
    // Fetch user data from the database using email
    const user = await UsersModel.findOne({ 'users.email': email }, { 'users.$': 1 });

    // if (!user) {
    //   return res.status(404).json({ message: 'User not found' });
    // }


    const foundUser = user?.users?.[0] || {}; // Extract the user from the array

    // Use user data if available, otherwise use form data
    const finalFirstName = firstName || foundUser?.userName;
    const finalPhoneNumber = phoneNumber || foundUser?.contact;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: "aurifycontact@gmail.com",
        pass: "hnrgcobxcinqbuae",
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'aurifycontact@gmail.com', // Replace with your company's email
      subject: 'New Contact Form Submission',
      html: mjml2html(
        `<mjml>
            <mj-head>
              <mj-attributes>
                <mj-text font-family="Helvetica, Arial, sans-serif" color="#55575d" />
                <mj-class name="header" font-size="24px" color="#ffffff" font-weight="bold" />
                <mj-class name="footer" font-size="12px" color="#999999" />
              </mj-attributes>
              <mj-style inline="inline">
                .bg-gradient {
                  background: linear-gradient(to right, #7e22ce, #ec4899);
                }
              </mj-style>
            </mj-head>
            <mj-body background-color="#f0f0f0">
              <!-- Header Section -->
              <mj-section css-class="bg-gradient" padding="20px">
                <mj-column>
                  <mj-image src="https://via.placeholder.com/150x50?text=Company+Logo" alt="Company Logo" width="150px" />
                  <mj-text mj-class="header" align="center" padding-top="10px">Company Name</mj-text>
                </mj-column>
              </mj-section>

              <!-- Main Content Section -->
              <mj-section background-color="#ffffff" padding="20px">
                <mj-column>
                  <mj-divider border-width="2px" border-color="linear-gradient(to right, #7e22ce, #ec4899)" />
                  <mj-text font-size="16px" color="#333333" line-height="1.5em">
                    <strong>Name:</strong> ${finalFirstName} ${lastName} <br />
                    <strong>Company:</strong> ${companyName} <br />
                    <strong>Email:</strong> ${email} <br />
                    <strong>Phone:</strong> ${finalPhoneNumber} <br />
                    <strong>Message:</strong> ${message}
                  </mj-text>
                </mj-column>
              </mj-section>

              <!-- Footer Section -->
              <mj-section background-color="#333333" padding="10px">
                <mj-column>
                  <mj-text mj-class="footer" align="center">
                    Company Support Team<br />
                    Email: support@company.com<br />
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

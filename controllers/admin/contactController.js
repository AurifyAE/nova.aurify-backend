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
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-divider border-color="#F45E43"></mj-divider>
                <mj-text font-size="20px" color="#F45E43" font-family="helvetica">
                  Name: ${finalFirstName} ${lastName}
                  Company: ${companyName}
                  Email: ${email}
                  Phone: ${finalPhoneNumber}
                  Message: ${message}
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

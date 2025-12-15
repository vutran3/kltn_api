const nodemailer = require("nodemailer");
const createHttpError = require("http-errors");
const { convertMarkdownToHtmlTable } = require(".");
const { EXPERT_EMAIL, EMAIL_NAME, EMAIL_APP_PASS } = process.env;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_NAME,
        pass: EMAIL_APP_PASS
    }
});

const getEmailTemplate = (deviceId, status, time) => {
    const isOnline = status === "ONLINE";
    const color = isOnline ? "#2ecc71" : "#e74c3c";
    const title = isOnline ? "Thiết bị Đã Kết Nối Lại" : "Cảnh Báo Mất Kết Nối";
    const icon = isOnline ? "✅" : "⚠️";

    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            
            <div style="background-color: ${color}; padding: 20px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${icon} ${title}</h1>
            </div>

            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #555555; margin-bottom: 20px;">
                    Hệ thống giám sát IoT xin thông báo về sự thay đổi trạng thái của thiết bị.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="border-bottom: 1px solid #eeeeee;">
                        <td style="padding: 10px 0; color: #888; font-size: 14px;">Mã thiết bị:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${deviceId}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eeeeee;">
                        <td style="padding: 10px 0; color: #888; font-size: 14px;">Trạng thái mới:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: ${color}; font-size: 14px;">${status}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #888; font-size: 14px;">Thời gian ghi nhận:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${time}</td>
                    </tr>
                </table>

                <div style="text-align: center; margin-top: 30px;">
                    <a href=${process.env.FRONTEND_URL} style="background-color: #333333; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Truy cập Dashboard</a>
                </div>
            </div>

            <div style="background-color: #eeeeee; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
                <p style="margin: 0;">Email này được gửi tự động từ hệ thống IoT Server.</p>
                <p style="margin: 5px 0 0 0;">© 2025 Smart Agriculture System</p>
            </div>
        </div>
    </div>
    `;
};

const sendAlertEmail = async (deviceId, status) => {
    const timeString = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const subject = `[IoT Alert] Thiết bị ${deviceId} đang ${status}`;

    try {
        const device = await Device.findOne({ device_id: deviceId }).populate("owner");
        const owner = device.owner;

        if (!owner.email) throw createHttpError.BadRequest("Người dùng không có email");
        const htmlContent = getEmailTemplate(deviceId, status, timeString);

        await transporter.sendMail({
            from: "IoT System",
            to: owner.email,
            subject: subject,
            html: htmlContent
        });
        console.log(`Đã gửi mail cảnh báo ${status} cho ${deviceId}`);
    } catch (err) {
        console.error("Lỗi gửi mail:", err);
    }
};

const getExpertEmailTemplate = (deviceId, detectDate, advice) => {
    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2563eb;">Yêu cầu xác nhận từ chuyên gia</h2>
        <p>Hệ thống IoT nhận được kết quả chẩn đoán từ AI và cần chuyên gia xác nhận.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Thiết bị:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${deviceId}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Thời gian:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(detectDate).toLocaleString(
                    "vi-VN"
                )}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>AI Chẩn đoán:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; white-space: pre-wrap;">${convertMarkdownToHtmlTable(
                    advice
                )}</td>
            </tr>
        </table>

        <p style="margin-top: 20px;">
            <em>Vui lòng xem ảnh đính kèm và cập nhật phản hồi vào hệ thống.</em>
        </p>
    </div>
    `;
};

const sendExpertReviewEmail = async ({ deviceId, detectDate, advice, imageBuffer, ragId }) => {
    try {
        if (!EXPERT_EMAIL) {
            console.error("Chưa cấu hình EXPERT_EMAIL trong .env");
            return;
        }

        const htmlContent = getExpertEmailTemplate(deviceId, detectDate, advice);

        await transporter.sendMail({
            from: '"IoT AI System" <no-reply@iot-system.com>',
            to: EXPERT_EMAIL,
            subject: `[Expert Review] Yêu cầu kiểm tra kết quả AI - ${deviceId}`,
            html: htmlContent,
            attachments: imageBuffer
                ? [
                      {
                          filename: `detect-${ragId}.jpg`,
                          content: imageBuffer
                      }
                  ]
                : []
        });

        console.log(`Đã gửi mail cho chuyên gia về Rag ID: ${ragId}`);
        return true;
    } catch (err) {
        console.error("Lỗi gửi mail chuyên gia:", err);
        return false;
    }
};

module.exports = {
    sendAlertEmail,
    sendExpertReviewEmail
};

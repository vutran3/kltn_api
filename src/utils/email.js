const nodemailer = require("nodemailer");
const createHttpError = require("http-errors");
const { convertMarkdownToHtmlTable } = require(".");
const { EXPERT_EMAIL, EMAIL_NAME, EMAIL_APP_PASS, FRONTEND_URL } = process.env;

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

const getExpertEmailTemplate = (deviceId, detectDate, advice, ragId) => {
    const reviewLink = `${process.env.FRONTEND_URL}/expert/review/${ragId}`;

    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #2563eb; text-align: center;">Yêu cầu xác nhận từ chuyên gia</h2>
        <p style="text-align: center; color: #555;">Hệ thống IoT nhận được kết quả chẩn đoán từ AI và cần chuyên gia xác nhận.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Thiết bị:</strong> ${deviceId}</p>
            <p><strong>Thời gian:</strong> ${new Date(detectDate).toLocaleString("vi-VN")}</p>
        </div>

        <div style="margin-bottom: 20px;">
            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">AI Chẩn đoán sơ bộ:</h3>
            ${convertMarkdownToHtmlTable(advice)}
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin-bottom: 15px;">Vui lòng truy cập hệ thống để xem ảnh gốc và đưa ra kết luận:</p>
            <a href="${reviewLink}" 
               style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
               Truy cập trang đánh giá
            </a>
        </div>
    </div>
    `;
};

const sendExpertReviewEmail = async ({ deviceId, detectDate, advice, imageBuffer, ragId }) => {
    try {
        if (!EXPERT_EMAIL) throw createHttpError.BadRequest("Chưa có chuyên gia để tư vấn");
        const htmlContent = getExpertEmailTemplate(deviceId, detectDate, advice, ragId);

        await transporter.sendMail({
            from: '"IoT AI System" <no-reply@iot-system.com>',
            to: EXPERT_EMAIL,
            subject: `[Expert Review] Yêu cầu kiểm tra kết quả AI - ${deviceId}`,
            html: htmlContent,
            attachments: imageBuffer ? [{ filename: `detect-${ragId}.jpg`, content: imageBuffer }] : []
        });

        return true;
    } catch (err) {
        throw createHttpError.BadRequest("Lỗi gửi mail chuyên gia");
    }
};

const getAdviceEmailTemplate = (deviceId, adviceHtml) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: #10b981; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            
            /* Style cho HTML từ AI trả về */
            .section { margin-bottom: 24px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 16px; }
            .section h3 { color: #059669; font-size: 18px; margin-top: 0; border-left: 4px solid #059669; padding-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px; }
            th { background: #f0fdf4; color: #166534; padding: 8px; border: 1px solid #dcfce7; }
            td { padding: 8px; border: 1px solid #e5e7eb; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .btn { display: inline-block; background: #333; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size: 24px;">🌱 Kế Hoạch Cải Thiện Môi Trường</h1>
                <p style="margin:5px 0 0;">Thiết bị: ${deviceId}</p>
            </div>
            <div class="content">
                <p>Hệ thống AI đã phân tích dữ liệu cảm biến và đề xuất lộ trình xử lý sau:</p>
                
                ${adviceHtml}

                <div style="text-align: center;">
                    <a href="${FRONTEND_URL}" class="btn">Theo dõi tiến độ trên App</a>
                </div>
            </div>
            <div class="footer">
                <p>© 2025 Smart Agriculture System - AI Advisor</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const sendAdviceEmail = async (userEmail, deviceId, adviceHtml) => {
    try {
        console.log({
            userEmail,
            deviceId,
            adviceHtml
        });
        if (!userEmail) throw new Error("User email is required");

        const htmlContent = getAdviceEmailTemplate(deviceId, adviceHtml);

        await transporter.sendMail({
            from: '"Smart Agri AI" <no-reply@agri-system.com>',
            to: userEmail,
            subject: `[Kế hoạch 7-14 ngày] Đề xuất xử lý cho thiết bị ${deviceId}`,
            html: htmlContent
        });

        return true;
    } catch (err) {
        console.log(err);
        throw createHttpError.InternalServerError("Không thể gửi email kế hoạch");
    }
};
module.exports = {
    sendAlertEmail,
    sendExpertReviewEmail,
    sendAdviceEmail
};

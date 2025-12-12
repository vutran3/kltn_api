export const getEmailTemplate = (deviceId, status, time) => {
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

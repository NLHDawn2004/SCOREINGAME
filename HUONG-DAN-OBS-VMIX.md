# Gắn bảng điểm vào OBS / vMix

1. Mở `E:\Tool\ĐIỂM\START.cmd`. Giữ cửa sổ này chạy. Nếu bản local cũ đang mở, đóng cửa sổ chạy cũ rồi mở lại.
2. Trên trang `http://127.0.0.1:4173/`, chọn thư mục Debugger để đọc log thật.
3. Bấm **Xuất OBS/vMix** → **Sao chép link**.
4. Trong OBS thêm **Browser Source**; trong vMix thêm **Web Browser**. Dán link:

   http://127.0.0.1:4173/overlay.html

5. Đặt khung nguồn trình duyệt Width **1920**, Height **1080** một lần để dùng toàn bộ khoảng chỉnh. Trên bảng điều khiển, nhập **Rộng** và **Cao** tại mục **Kích thước overlay**, rồi bấm **Áp dụng**. Kích thước mặc định là **350 × 730**. Overlay thu vừa khung nguồn nếu bạn đặt khung nhỏ hơn bảng. Giữ trang điều khiển đọc log mở.

Link chỉ hiển thị logo, tên đội, PTS, ELIMS và nhãn ELIMINATED khi đội bị loại. Không có nút hoặc thông báo. Dùng trên cùng máy chạy bộ đọc. Khi sửa tên/logo hoặc có điểm mới, bảng xuất tự cập nhật. Sau khi mở lại START.cmd, bấm Xuất OBS/vMix để nối lại trang điều khiển.

Tab xem trước trên Render dùng link có tham số tab. Browser Source nhận dữ liệu qua link nội bộ ở bước 4. Trạng thái điểm lưu của hai địa chỉ trình duyệt được giữ riêng; có thể chọn lại log chứa các trận để dựng lại tổng trên bản local.

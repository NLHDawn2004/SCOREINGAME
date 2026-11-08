# FF Live Score v1.36

Bản Web Service trên Render hỗ trợ **Xuất OBS/vMix** qua mạng. Triển khai từ nhánh main với Runtime Node, Build Command `true`, Start Command `node serve.mjs` và Health Check Path `/healthz`. Render tự cung cấp `RENDER_EXTERNAL_HOSTNAME` và `PORT`. Khi chạy START.cmd, bản tại máy tiếp tục dùng cổng 4173.

# FF Live Score v1.32

Bấm **Đọc KV** và chọn thư mục HUD_PIC. Tool tự tìm ảnh nền hàng và tiêu đề PNG phù hợp, rồi dùng chúng cho bảng dọc. Thiếu ảnh tiêu đề thì dùng tiêu đề mặc định.

# FF Live Score v1.19

Bấm **Nạp thư mục KV**, chọn thư mục HUD_PIC chứa `ScoreboardBackground.png` và `ScoreboardTab.png`. KV áp dụng cho bảng chính, tab xuất và link OBS/vMix tại máy. Overlay giữ vùng trong suốt của PNG. Bấm **Gỡ KV** để quay về kiểu mặc định. Chọn lại thư mục khi tải lại trang.

# FF Live Score v1.18

Chọn file debugger đang chạy hoặc theo dõi thư mục Debugger. Bảng chính và overlay hiển thị TEAM, PTS, ELIMS. Mỗi mạng đã xác nhận cộng 1 PTS và 1 ELIMS. Khi kết thúc trận, thứ hạng xác định từ log được cộng lần lượt 12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0 điểm. Hạng ngoài 12 nhận 0 điểm top. Đội mất đủ bốn người hiện ELIMINATED và chuyển xám. Bảng sắp theo PTS rồi ELIMS.

Kết quả lưu từ bản cũ giữ điểm đã lưu đến khi đọc lại đúng log. Bản phát lại đầy đủ nhận diện theo danh sách thành viên và chuỗi sự kiện khi cả hai bản đã được đối chiếu. Log thiếu dữ liệu có thể chờ xác nhận đội hoặc điểm top.

Các mục dưới đây là lịch sử thay đổi.

# v1.17 — Sửa ALIVE sau cứu dậy

Ghép ID người được cứu từ `SyncAssistedDuringBeRescured` với kết quả thành công cùng thời gian và frame. Bắt đầu cứu chưa đổi vàng; ID người hỗ trợ không bị coi là người được cứu. Chỉ đọc file debugger, giữ màu chết xám.

# v1.16 — Chỉ đọc file debug

Chỉ nhận file debugger-YYYY-MM-DDTHH-MM-SS.log trong thư mục Debugger. Chọn file riêng có kiểm tra tên; file khác bị từ chối và giữ nguồn cũ đang chạy. Theo dõi thư mục chỉ lấy file debugger mới nhất, không mở Player.log/Player-prev.log. Đã bỏ hướng dẫn nguồn Player.log. Giữ tối ưu kiểm tra mỗi 100 ms, xử lý điểm, lưu trận và bảng xuất.

---

# v1.15 — Xám cho người chết, làm mờ đội bị loại

Vạch ALIVE đã chết chuyển từ đen sang xám #7c8491. Đội có đủ 4 người và cả 4 đã chết chuyển nền xám, làm mờ tên/logo/PTS/ELIMS; logo chuyển thang xám. Áp dụng ở bảng điều khiển, tab xuất và OBS/vMix. Các vạch xám giữ độ rõ để đọc trạng thái. Đội thiếu thành viên, còn sống hoặc bị knock không bị làm mờ. Khi có hồi sinh, đội sáng trở lại theo dữ liệu mới.

---

# v1.13 — Lưu và xóa điểm từng trận

Mục Điểm từng trận trên bảng điều khiển liệt kê từng trận theo thời gian, số đội và tổng PTS/ELIMS. Bấm Lưu điểm trận đang chọn hoặc Lưu ở từng hàng để ghi lại kết quả. Trận đang đấu được lưu tạm; dữ liệu mới vẫn cập nhật vào tổng, không cộng trùng. Khi kết thúc vẫn tự lưu kết quả cuối.

Xem mở điểm riêng của trận, kể cả khi chỉ còn dữ liệu đã lưu mà không mở file nguồn. Xóa mở hộp xác nhận trong web, loại riêng trận đó khỏi tổng và ghi nhớ để đọc lại log không tự cộng lại. Nếu trận còn trong file đang đọc, bấm Lưu lại để đưa vào tổng; nếu đã đổi nguồn thì cần mở lại log chứa trận đó. Các trận khác và file debug không thay đổi. Dữ liệu được lưu trên cùng trình duyệt/địa chỉ đang sử dụng. Demo chỉ lưu thử trong bộ nhớ, không trộn vào điểm thật.

---

# v1.12 — Xuất tự mở tab bảng điểm

Bấm Xuất bảng điểm để tự mở một tab mới chỉ chứa bảng điểm trong suốt 350 × 730 px. Trang điều khiển giữ liên kết Mở lại bảng điểm. Tên, logo, điểm và ALIVE tự đồng bộ khi trang điều khiển đang mở; tab mới hoặc tab được tải lại sẽ yêu cầu lại dữ liệu hiện tại. Chức năng tab riêng chạy trên cả bản hosted và bản local trong cùng trình duyệt. Nếu trình duyệt chặn tab tự mở, bấm liên kết Mở lại bảng điểm.

Nút Link OBS/vMix giữ riêng chức năng lấy URL nội bộ cho nguồn trình duyệt OBS/vMix. Link tab có tham số tab chỉ dùng trong cùng trình duyệt với bảng điều khiển; không dùng thay URL OBS trên tiến trình khác. Mã nguồn chính ở E:/Tool/ĐIỂM.

---

# v1.11 — Xuất link OBS / vMix

1. Chạy START.cmd trong E:/Tool/ĐIỂM, giữ cửa sổ này mở. Nếu đang chạy bản local cũ, đóng cửa sổ chạy cũ rồi mở lại START.cmd.
2. Ở http://127.0.0.1:4173/, chọn thư mục Debugger để đọc dữ liệu thật.
3. Bấm Xuất bảng điểm, sao chép link http://127.0.0.1:4173/overlay.html.
4. OBS: thêm Browser Source. vMix: thêm Web Browser. Dán link, Width 350 / Height 730. Dùng trên cùng máy.
5. Giữ trang điều khiển đọc log mở. Link tự nhận bảng đang chọn, tên đã sửa, logo, PTS, ELIMS, ALIVE.

Bảng xuất không có nút, thông báo hay phần điều khiển; nền trong suốt. 12 đội dùng hàng 58 px; số đội nhiều hơn tự thu hàng để vừa chiều cao 730 px. Khi mất kết nối giữ bảng gần nhất và tự thử lại. Chưa có dữ liệu thì để trống. Sau khi mở lại bộ chạy, bấm Xuất bảng điểm để bật truyền dữ liệu từ trang điều khiển.

Bản hosted có nút hướng dẫn mở bản local; không hứa link hosted tự có quyền đọc file trên máy. Chỉ dữ liệu bảng hiển thị được truyền giữa các trình duyệt qua bộ chạy 127.0.0.1; log thô và ID người chơi không được gửi sang bảng xuất hay lên máy chủ. Logo được truyền một lần khi thay đổi, không đòi quyền chọn file ở OBS. Điểm đã lưu vẫn nằm trên trình duyệt điều khiển tại cùng địa chỉ local (khác bộ nhớ của trang hosted).

---

# v1.10 — Kích đúp sửa đội

Kích đúp vào tên, logo hoặc hàng của đội để mở cửa sổ sửa tên hiển thị và chọn logo riêng (không bắt buộc tên file). Bấm Lưu thay đổi; Hủy giữ nguyên; Khôi phục trở về tên log và logo tự ghép. Có thể dùng phím F2 trên hàng đang chọn. Điểm, ID, cách cộng dồn và ALIVE không thay đổi khi sửa tên. Chỉnh sửa áp dụng cả bảng tổng và từng trận khi xác định được cùng đội; các đội trùng tên được phân biệt bằng UID hoặc tham chiếu trận, không tự sửa đồng loạt.

Tên sửa được lưu trên trình duyệt; logo riêng giữ trong phiên trang, tương tự logo tải hàng loạt. Chỉnh sửa trong demo tách khỏi đội thật.

---

# v1.9 — Logo theo tên đội

Bấm Thêm logo theo tên đội rồi chọn nhiều file cùng lúc. Đặt tên file giống tên đội: STNN.png, TTE.jpg, LàngSìChum.webp. Hỗ trợ PNG/JPG/JPEG/WebP, mỗi file tối đa 2 MB; kiểm tra ảnh có đọc được trước khi thay logo cũ. Không phân biệt chữ hoa/thường, bỏ khoảng trắng đầu/cuối, giữ nguyên dấu và khoảng trắng bên trong tên.

Logo tự xuất hiện trên bảng tổng và từng trận, kể cả khi nạp trước khi kết nối log; đổi file hoặc chuyển trận vẫn giữ logo trong phiên trang này. Logo chỉ đọc trên máy, không tải lên máy chủ; tải lại trang cần chọn logo lại. Hai đội cùng tên dùng chung logo theo quy tắc tên file; vẫn có thể chọn từng trận để gán logo riêng thủ công.

---

# v1.8 — ALIVE theo ID trong trận hiện tại

Bảng chính có TEAM / PTS / ELIMS / ALIVE. PTS và ELIMS vẫn cộng dồn các trận đã lưu; ALIVE chỉ dùng đội và ID người chơi của trận đang xem/đang đọc, không lấy trạng thái trận cũ. Mỗi đội 4 vạch: vàng còn sống, đỏ bị knock, đen chết. Cứu dậy có xác định ID chuyển đỏ về vàng; hồi sinh sau chết đưa người chơi về vàng. Các vạch chưa ghép được thành viên mặc định vàng theo yêu cầu. Đội không tham gia trận hiện tại hiện Ngoài trận, không dùng trạng thái cũ. Di chuột vào vạch để xem tên và ID người chơi.

Giới hạn nguồn: log thật đã kiểm tra có knock, chết và hồi sinh sau chết, nhưng chưa tìm thấy bản ghi cứu dậy xác định ID nạn nhân. Bản này không tự suy đoán cứu dậy theo thời gian hoặc lấy ID người cứu làm người được cứu. Khi thiếu bản ghi, màu giữ theo sự kiện đã nhận gần nhất.

---

# v1.7 — Tự lưu điểm sau trận và căn cột

Khi log xác nhận trận kết thúc, PTS và ELIMS của trận được tự lưu trên trình duyệt đang dùng. Kết quả vẫn được cộng dồn khi chọn file mới, game tạo log phiên mới hoặc tải lại web. Đọc lại cùng trận chỉ cập nhật kết quả đó, không cộng trùng. Trận đang đấu tiếp tục cộng tạm vào bảng tổng. Demo không lưu và không lẫn vào kết quả thật.

Dùng cùng trình duyệt và địa chỉ web để giữ điểm; xóa dữ liệu trình duyệt sẽ mất điểm đã lưu. Không lưu log thô lên máy chủ. Dòng trạng thái dưới bảng cho biết số trận đã lưu hoặc lỗi lưu. Bấm Bắt đầu giải mới để xóa tổng cũ khỏi bảng; có xác nhận trước khi thực hiện.

Đã sửa căn giữa đồng nhất tiêu đề và số của PTS/ELIMS, tăng khoảng cách và độ rộng hai cột, giữ chữ số cùng độ rộng.

---

# v1.6 — Bảng xếp hạng cộng dồn trực tiếp

Mặc định bảng hiển thị Hạng / TEAM / PTS / ELIMS, tự sắp PTS giảm dần rồi ELIMS. PTS cộng giá trị TeamScore mới nhất của từng trận đã đọc; ELIMS cộng sự kiện hạ gục đã xác định. Không cộng lặp mỗi lần đọc file. Chọn Tổng các trận để theo trực tiếp; chọn một trận để xem riêng và đối chiếu thành viên. Hai đội trùng tên được tách theo UID; trường hợp chưa xác định được liên kết giữ riêng, không tự gộp.

Chọn Theo dõi thư mục Debugger để tự theo log mới; chu kỳ kiểm tra 200 ms. Tổng chỉ tính các trận trong nguồn đang đọc. Đổi nguồn, log bị thay thế hoặc chuyển file phiên mới sẽ tính lại theo nguồn đó. Không gửi log lên máy chủ. Không tự đặt công thức điểm giải.

Kiểm tra: 39 bài kiểm tra tự động; phát lại file 5 trận đối chiếu STNN 102, HOD 99, MQE 80 PTS. ALIVE không còn là cột của bảng chính.

---

# FF Live Score

Web đọc file debug Free Fire PC, hiển thị TEAM / ELIMS / PTS / ALIVE. Dữ liệu file được xử lý tại máy; không gửi log lên máy chủ. Không cài thêm thư viện.

## Bản 1.5: đội có một mạng và kiểm tra log đang chạy

Ghép nhóm người chơi ngay sau một cặp sự kiện không mơ hồ: chỉ một đội tăng đúng một điểm, sau đó là sự kiện chết có người hạ và nạn nhân đã xác định, cùng frame game và trong 250 ms. Không cần đợi hai mạng. Nếu nhiều đội cùng tăng điểm, khác frame, hoặc bằng chứng xung đột thì không gán bừa. Sửa này giúp đội chỉ có một mạng không giữ trạng thái bốn người mặc định mãi.

**Sửa này không khắc phục được sự kiện cứu dậy không có trong file.** Trong debugger-2026-10-25T14-25-27.log đã kiểm tra, có knock, chết và 68 lần hồi sinh sau chết; không tìm thấy bản ghi xác định nạn nhân đã được cứu khỏi knock. Toàn bộ 68 AddPlayer lặp sau chết đi cùng hồi sinh, không có AddPlayer khi còn đang knock để dùng làm tín hiệu cứu. Không thể coi hồi sinh sau chết là cứu dậy khỏi knock. Vì vậy màu đỏ vẫn chỉ là trạng thái cuối log đã ghi, có thể chậm so với trạng thái thực tế sau cứu dậy. Không dùng bộ đếm thời gian để giả lập phục hồi.

Đọc trạng thái web thật lúc kiểm tra cho thấy nguồn đúng tên file mới, thời gian kiểm tra 0 giây trước, lần đọc gần nhất khoảng 8 ms, chu kỳ yêu cầu 200 ms. Chưa đo được độ trễ từ lúc sự kiện xảy ra trong game tới lúc game ghi ra đĩa; không khẳng định lỗi chậm đã được sửa. Muốn phản ánh cứu dậy chính xác cần nguồn trạng thái bổ sung hoặc đối chiếu BXH trực tiếp.

## Bản 1.4: mặc định 4 thanh vàng

Theo yêu cầu mới, mỗi đội bắt đầu với 4 thanh vàng, kể cả khi chưa ghép được thành viên. Đây là mặc định do người dùng chọn. Thành viên đã nhận được trạng thái knock/chết sẽ giữ đỏ/đen; các vị trí còn thiếu giữ vàng cho đủ 4 thanh. Mặc định này thay thế quy tắc Chờ liên kết ở các phiên bản trước; việc ghép đội chính xác vẫn cần dữ liệu tương ứng.

## Bản 1.3: nguồn phiên mới, khởi tạo sớm và giới hạn đã kiểm tra

Ưu tiên **Theo dõi thư mục** và chọn đúng thư mục `Debugger` bằng Chrome/Edge. Ứng dụng đọc file `debugger-YYYY-MM-DDTHH-MM-SS.log` phiên mới nhất theo tên; tự chuyển khi game tạo file mới. Nếu chưa có log, tiếp tục thử lại. Chế độ Chọn một file chỉ bám file được chọn; không thể tự biết game đã tạo file khác.

Chu kỳ yêu cầu kiểm tra là 200 ms, không phải cam kết game luôn ghi ra đĩa trong 200 ms. Hiển thị tên nguồn, cảnh báo file một thời gian không thay đổi và thời gian dòng log cuối. Không nhầm thời gian kiểm tra file với thời gian game có dữ liệu mới.

Đọc `Player Join` (gồm UID, player ID, gsTeam) ngay khi xuất hiện, thay vì chờ đối tượng quan sát tải xong. Tên đội tạo dòng ngay từ `OnTeamScoreInited`. Ở đầu trận được đọc từ Join Match, khởi tạo ELIMS/PTS bằng 0 trước sự kiện hạ gục; dữ liệu điểm tiếp theo thay thế giá trị đó. ALIVE đã biết vẫn là các vạch vàng/đen/đỏ. Thiếu liên kết giữa tên đội và nhóm người chơi thì hiện Chờ liên kết, không đổi dấu hỏi thành những vạch vàng giả. Tổng trên đầu trang là số người/sự kiện đã nhận, không khẳng định danh sách đã đầy đủ.

**Không thể khẳng định yêu cầu ALIVE chính xác cho mọi đội trước đường bay chỉ bằng log mẫu này.** Log ghi tên theo Score TeamID và thành viên theo gsTeam nhưng không ghi quan hệ trực tiếp giữa hai bộ mã. Việc ghép hiện tại vẫn cần bằng chứng sự kiện hoặc đối chiếu nhóm; cần danh sách đội kèm UID/thành viên để có liên kết đáng tin cậy ngay trước trận. Chưa có dữ liệu đó thì yêu cầu này chưa hoàn tất.

Đối chiếu bản ghi do người dùng chọn: file `debugger-2026-10-24T19-55-58.log` kết thúc 21:45:13 ngày 24/10; đây không phải nguồn phiên mới. Trong trận đầu, tên đủ 15 đội có lúc 20:05:31.999; mốc OnFlightAttached đầu tiên là 20:06:10.731; Player Join cuối của 60 người tới lúc 20:06:14.049. Không có cách đọc nhanh hơn để nhận một dòng chưa được game ghi.

## Bản 1.2: tên đội từ log và ba trạng thái ALIVE

- Các dòng trên bảng được tạo từ `OnTeamScoreInited` theo tên đội thật, không lấy `GS1`, `GS2` làm tên đội. Tên hiện ngay khi nhận được danh sách đội, kể cả đội chưa có mạng hạ gục. Hai đội trùng tên vẫn là hai dòng riêng theo ID.
- PTS đọc trực tiếp theo ID đội trong bảng điểm. Danh sách người chơi, ELIMS và ALIVE được ghép khi có đủ bằng chứng hoặc sau khi người dùng đối chiếu nhóm thành viên. Chưa ghép được thì các chỉ số đó hiện `?`, không gán nhầm cho đội có mã số giống nhau.
- ALIVE: **vàng = còn sống; đen = đã chết; đỏ = KnockDown**. Bị knock vẫn được tính là chưa chết và không cộng ELIMS. Dòng đội bị loại không làm đổi màu vạch đen.
- KnockDown nhận từ `Player 'ID' Knock Down` hoặc `Teammate ID Knock Down`; sự kiện trùng không đếm hai lần. Chết và hồi sinh cập nhật trạng thái tương ứng.
- Cứu dậy chỉ đổi sang vàng khi có sự kiện xác định đúng người được cứu: hỗ trợ dòng `Player 'ID' Get Up / Stand Up / Recovered`, `Teammate ID Get Up / Stand Up / Recovered`, hoặc sự kiện `Revive Player ID,…`. Các dạng Get Up/Stand Up/Recovered được kiểm tra bằng dữ liệu mô phỏng, chưa thấy trong log mẫu.
- Log mẫu ghi rõ knock, chết và hồi sinh, nhưng chưa tìm thấy dòng cứu dậy xác định ID nạn nhân. Dòng `assistPlayer` chỉ nói người hỗ trợ, không được dùng để đoán người đã đứng dậy. Nếu game không ghi sự kiện phục hồi, màu đỏ giữ theo trạng thái cuối được ghi đến khi có sự kiện hợp lệ kế tiếp; không tự đoán bằng thời gian.

## Bản 1.1: đọc liên tục và điểm tổng

- Không có cơ chế tự tạm dừng sau số lần đọc lỗi. File tạm bận, chưa có dòng mới hay trận kết thúc đều không làm ngừng kiểm tra file.
- Khi đọc lỗi, giữ bảng hợp lệ gần nhất và thử lại mỗi giây. Lần đọc dở không làm mất tên đội đã gán. Nếu quyền truy cập bị thu hồi, cần chọn lại file để cấp quyền; ứng dụng vẫn tiếp tục thử kết nối.
- ELIMS là số mạng hạ gục quan sát được. PTS là giá trị `TeamScore` mới nhất của đội trong trận đang chọn, có thể gồm điểm xếp hạng. Hai cột độc lập. Không tự cộng dồn nhiều trận hoặc áp dụng một bảng điểm giải đấu chưa được cung cấp.
- Xếp theo PTS giảm dần, hòa PTS xét ELIMS. PTS chưa được ghi hoặc chưa xác định mã đội sẽ hiện `?` thay vì bịa điểm.
- Không dùng chế độ đọc file một lần làm nguồn trực tiếp. Trình duyệt không có API đọc liên tục được hướng dẫn mở Chrome/Edge.
- Trình duyệt bị đóng, đưa vào trạng thái ngủ hoặc máy ngủ vẫn không thể chạy mã web. Giữ cửa sổ hoạt động khi phát sóng; sau khi trở lại trang, ứng dụng tự kiểm tra phần log mới.

## Bắt đầu

1. Dùng Chrome hoặc Edge trên Windows. Với bản trực tuyến, mở đường dẫn trong tab trình duyệt riêng.
2. Bấm **Chọn file debug**, chọn file `.log` mới nhất trong thư mục `Free Fire_64_Data/Debugger`.
3. Chọn file sau khi mở game và trước khi vào trận ở chế độ quan sát để có đủ danh sách người chơi. File mẫu có 5 trận, ứng dụng mặc định chọn trận cuối.
4. Bảng kiểm tra phần file mới mỗi giây. Khi game tạo file mới, chọn lại file. Độ trễ phụ thuộc game ghi ra đĩa và trình duyệt cho phép chạy nền.
5. Chọn dòng đội để xem thành viên và gán tên đội hoặc thêm logo. Tên tự ghép có nhãn suy ra; hãy đối chiếu trước khi phát sóng.

## Chạy bản local

Máy cần Node.js. Giải nén toàn bộ thư mục, chạy `START.cmd` hoặc `node serve.mjs`, sau đó mở `http://127.0.0.1:4173` bằng Chrome/Edge. Giữ cửa sổ chạy máy chủ mở khi sử dụng. Máy chủ chỉ phục vụ file giao diện ở máy này, không đọc log; trình duyệt mới có quyền đọc file bạn chọn.

## Dùng với OBS

Chọn **Chế độ lên sóng**, thêm nguồn **Window Capture / Chụp cửa sổ** của trình duyệt trong OBS. Giữ Alt và kéo mép để cắt phần thừa. Giữ cửa sổ trình duyệt hoạt động, không thu nhỏ; kiểm tra thời gian đọc gần nhất. **Browser Source không kế thừa quyền chọn file của Chrome/Edge.** Nhấn Escape hoặc Trở về bảng điều khiển để thoát chế độ lên sóng.

## Quy tắc dữ liệu

- Người chơi và nhóm GS: `[UIModelSpectator] AddPlayer id…,name…,gsTeam…`.
- Tên đội trong bảng điểm: `OnTeamScoreInited -> TeamName: … TeamID: …`. **TeamID và gsTeam khác nhau**, không ghép bằng mã số giống nhau.
- Tên đội đọc trực tiếp từ danh sách bảng điểm. Tự suy ra quan hệ giữa nhóm người chơi và ID bảng điểm khi có ít nhất hai sự kiện tăng một điểm ngay trước một sự kiện hạ gục khớp cùng nhóm (trong 250 ms), không có ánh xạ xung đột. Nhóm chưa có đủ bằng chứng cần đối chiếu thành viên; không suy tên bằng phần đầu tên người chơi hoặc mã số nhóm.
- ELIMS đếm `Player … Dead, killed by …`, không cộng tự sát hoặc chết do đồng đội. `TeamScore` có thể cộng điểm xếp hạng, **không dùng làm số mạng**. Chưa kiểm chứng mọi chế độ tính mạng/đội của các phiên bản game.
- ALIVE dựa trên người chơi đã xuất hiện trong log, sự kiện chết và `Revive Player …`. Không coi `NotifyPlayerEnterPendingRevive` là đã hồi sinh.
- Tổng hiện `?` nếu thiếu phần đầu trận hoặc sự kiện thiếu người chơi. Không thể phát hiện mọi dòng bị mất khỏi log; con số chỉ phản ánh dữ liệu được ghi.
- Trận mới được nhận diện từ `Join Match Result, ERR_NONE`. Hỗ trợ nhiều trận trong một file. Tên gán thủ công và logo không tự mang sang trận khác.
- Đọc nối thêm theo byte, giải mã UTF-8 liên tục, giữ dòng cuối chưa có ký tự xuống dòng. Dòng cuối chỉ xuất hiện khi game hoàn tất ghi dòng đó.
- File nhỏ đi hoặc thay đổi phần đầu/đoạn cuối đã đọc sẽ được đọc lại. Nếu game thay file mới, nên chọn lại file mới vì quyền truy cập có thể vẫn trỏ file cũ. Không bảo đảm phát hiện thay đổi chỉ ở giữa file mà phần đầu/cuối giữ nguyên.
- Không có máy chủ dữ liệu, không can thiệp game. Không lưu log hoặc tên người chơi vào lưu trữ trình duyệt; tải lại trang phải chọn lại file. Logo giữ trong phiên này.
- Demo là dữ liệu giả lập, luôn có nhãn DEMO. Trình duyệt thiếu API đọc trực tiếp được báo không hỗ trợ, không đưa bản chụp một lần vào bảng trực tiếp.

## Kiểm tra

`node --test tests/core.test.mjs tests/live.test.mjs tests/team-status.test.mjs tests/source.test.mjs`

Bản này được đối chiếu với log OB55 do người dùng cung cấp. Bản game hoặc cấu trúc log khác có thể cần bổ sung bộ đọc. Không đính kèm log thật trong bộ cài.

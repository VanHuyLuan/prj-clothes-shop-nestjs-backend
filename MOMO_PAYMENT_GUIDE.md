# Hướng Dẫn Tích Hợp MoMo Payment

## Tổng quan
Hệ thống đã được tích hợp phương thức thanh toán MoMo cho phép khách hàng thanh toán đơn hàng thông qua ví điện tử MoMo.

## Cấu trúc

### 1. Database Schema
- **Bảng Payment**: Lưu trữ thông tin giao dịch thanh toán
- **Bảng Order**: Đã được cập nhật với `payment_method` và `payment_status`

### 2. API Endpoints

#### 2.1. Tạo thanh toán MoMo
```
POST /payment/momo/create
```

**Request Body:**
```json
{
  "orderId": "order-123456",
  "amount": 50000,
  "orderInfo": "Thanh toán đơn hàng #123456",
  "extraData": ""
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successful.",
  "payUrl": "https://test-payment.momo.vn/gw_payment/...",
  "orderId": "order-123456",
  "requestId": "MOMO1234567890",
  "resultCode": 0
}
```

**Cách sử dụng:**
1. Sau khi tạo đơn hàng, gọi API này với `orderId` và `amount`
2. Nhận về `payUrl` từ response
3. Chuyển hướng người dùng đến `payUrl` để thanh toán
4. Sau khi thanh toán xong, MoMo sẽ redirect về `MOMO_REDIRECT_URL`

#### 2.2. MoMo Callback (IPN)
```
POST /payment/momo/callback
```

**Mô tả:**
- Endpoint này được MoMo gọi tự động sau khi thanh toán thành công/thất bại
- Hệ thống sẽ tự động cập nhật trạng thái đơn hàng
- **Quan trọng:** URL này phải public và accessible từ internet

**Cấu hình IPN URL:**
- Development: Sử dụng ngrok hoặc localtunnel để expose local server
- Production: Sử dụng domain thực của bạn

#### 2.3. Truy vấn trạng thái thanh toán
```
GET /payment/momo/query/:orderId
```

**Response:**
```json
{
  "partnerCode": "MOMO",
  "orderId": "order-123456",
  "requestId": "MOMO1234567890",
  "amount": 50000,
  "resultCode": 0,
  "message": "Successful.",
  "localPaymentData": {
    "id": "payment-uuid",
    "status": "completed",
    "trans_id": "12345678",
    ...
  }
}
```

#### 2.4. Lấy thông tin thanh toán từ database
```
GET /payment/order/:orderId
```

## Cấu hình

### 1. Environment Variables (.env)
```env
# MoMo Payment Configuration
MOMO_PARTNER_CODE = "MOMO"
MOMO_ACCESS_KEY = "F8BBA842ECF85"
MOMO_SECRET_KEY = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create"
MOMO_REDIRECT_URL = "http://localhost:3000/payment/success"
MOMO_IPN_URL = "http://localhost:4000/payment/momo/callback"
```

**Lưu ý:**
- Credentials trên là của MoMo Test Environment
- Để sử dụng production, đăng ký tài khoản MoMo Business tại: https://business.momo.vn
- Production endpoint: `https://payment.momo.vn/v2/gateway/api/create`

### 2. Database Migration
Chạy migration để tạo bảng Payment:
```bash
npx prisma migrate dev --name add_payment_support
```

## Flow thanh toán MoMo - Chi tiết

### 📋 Tổng quan luồng

```
┌─────────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌─────────────┐
│   Customer  │────▶│ Frontend │────▶│ Backend │────▶│ MoMo API │────▶│ MoMo Server │
│             │◀────│          │     │         │◀────│          │     │             │
└─────────────┘     └──────────┘     └─────────┘     └──────────┘     └─────────────┘
      │                   │                │                │                  │
      │  1. Checkout      │                │                │                  │
      │──────────────────▶│                │                │                  │
      │                   │  2. Create     │                │                  │
      │                   │     Order      │                │                  │
      │                   │───────────────▶│                │                  │
      │                   │◀──────────────│                │                  │
      │                   │  Order Created │                │                  │
      │                   │                │                │                  │
      │  3. Pay with MoMo │                │                │                  │
      │──────────────────▶│                │                │                  │
      │                   │  4. Create     │                │                  │
      │                   │     Payment    │                │                  │
      │                   │───────────────▶│  5. Request    │                  │
      │                   │                │───────────────▶│                  │
      │                   │                │◀──────────────│                  │
      │                   │◀──────────────│  payUrl        │                  │
      │                   │  payUrl        │                │                  │
      │                   │                │                │                  │
      │  6. Redirect to payUrl             │                │                  │
      │───────────────────────────────────────────────────▶│                  │
      │                   │                │                │                  │
      │  7. Show QR Code / Payment Page    │                │                  │
      │◀───────────────────────────────────────────────────│                  │
      │                   │                │                │                  │
      │  8. Scan QR / Open App             │                │                  │
      │───────────────────────────────────────────────────▶│                  │
      │                   │                │                │                  │
      │  9. Confirm Payment in MoMo App    │                │                  │
      │───────────────────────────────────────────────────▶│                  │
      │                   │                │                │  Process Payment │
      │                   │                │                │─────────────────▶│
      │                   │                │                │◀─────────────────│
      │                   │                │                │  Payment Success │
      │                   │                │                │                  │
      │                   │                │  10. IPN       │                  │
      │                   │                │     Callback   │                  │
      │                   │                │◀───────────────────────────────────│
      │                   │                │  (resultCode=0)│                  │
      │                   │                │                │                  │
      │                   │                │  11. Verify    │                  │
      │                   │                │      Signature │                  │
      │                   │                │  12. Update    │                  │
      │                   │                │      Order     │                  │
      │                   │                │  13. Update    │                  │
      │                   │                │      Payment   │                  │
      │                   │                │────────────────────────────────────▶│
      │                   │                │  Success       │                  │
      │                   │                │                │                  │
      │  14. Redirect to Success Page      │                │                  │
      │◀───────────────────────────────────────────────────────────────────────│
      │                   │                │                │                  │
```

---

### 🔄 Chi tiết từng bước

#### **Bước 1-2: Tạo đơn hàng**

**Frontend (React/Vue/Next.js):**
```typescript
// 1. User click "Đặt hàng"
const handleCheckout = async () => {
  const response = await fetch('/orders/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      shippingAddress: {
        name: "Nguyễn Văn A",
        phone: "0912345678",
        street: "123 Đường ABC",
        city: "TP.HCM"
      }
    })
  });

  const order = await response.json();
  // order = { 
  //   order_number: "ORD-2026-001", 
  //   total_amount: 150000,
  //   status: "pending",
  //   payment_status: "unpaid"
  // }
  
  return order;
};
```

**Backend (NestJS):**
```typescript
// OrdersService.createFromCart()
// - Validate cart items
// - Check stock availability
// - Calculate total amount
// - Create order in database
// - Update product stock
// - Clear cart

const order = await this.prisma.order.create({
  data: {
    user_id: userId,
    order_number: 'ORD-2026-001',
    total_amount: 150000,
    status: 'pending',
    payment_status: 'unpaid',
    items: { create: orderItems }
  }
});
```

---

#### **Bước 3-5: Tạo thanh toán MoMo**

**Frontend:**
```typescript
// 2. User chọn "Thanh toán bằng MoMo"
const handleMomoPayment = async (order) => {
  const response = await fetch('/payment/momo/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.order_number,        // "ORD-2026-001"
      amount: order.total_amount,         // 150000
      orderInfo: `Thanh toán ${order.order_number}`
    })
  });

  const result = await response.json();
  // result = {
  //   success: true,
  //   payUrl: "https://test-payment.momo.vn/v2/gateway/pay?t=...",
  //   qrCodeUrl: "momo://app?action=payWithApp&isScanQR=true...",
  //   deeplink: "momo://app?action=payWithApp&isScanQR=false...",
  //   orderId: "ORD-2026-001",
  //   requestId: "MOMO1770140223906"
  // }

  return result;
};
```

**Backend - PaymentService.createPayment():**
```typescript
// 3. Generate unique requestId
const requestId = `MOMO${new Date().getTime()}`;
// requestId = "MOMO1770140223906"

// 4. Create raw signature string (theo thứ tự alphabet)
const rawSignature = [
  `accessKey=${accessKey}`,
  `amount=${amount}`,
  `extraData=${extraData}`,
  `ipnUrl=${ipnUrl}`,
  `orderId=${orderId}`,
  `orderInfo=${orderInfo}`,
  `partnerCode=${partnerCode}`,
  `redirectUrl=${redirectUrl}`,
  `requestId=${requestId}`,
  `requestType=${requestType}`
].join('&');

// 5. Generate HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(rawSignature)
  .digest('hex');
// signature = "ef825b4eb7ad6f4521513c8fea4632eaed40d06f8d2ba4ffea1db8184721997b"

// 6. Call MoMo API
const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    partnerCode: 'MOMO',
    accessKey: 'F8BBA842ECF85',
    requestId,
    amount: '150000',
    orderId: 'ORD-2026-001',
    orderInfo: 'Thanh toán ORD-2026-001',
    redirectUrl: 'http://localhost:3000/payment/success',
    ipnUrl: 'http://localhost:4000/payment/momo/callback',
    lang: 'vi',
    extraData: '',
    requestType: 'captureWallet',
    signature
  })
});

const result = await response.json();
// MoMo Response:
// {
//   partnerCode: "MOMO",
//   orderId: "ORD-2026-001",
//   requestId: "MOMO1770140223906",
//   amount: 150000,
//   responseTime: 1770140223576,
//   message: "Thành công.",
//   resultCode: 0,
//   payUrl: "https://test-payment.momo.vn/v2/gateway/pay?t=...",
//   deeplink: "momo://app?action=payWithApp&isScanQR=false...",
//   qrCodeUrl: "momo://app?action=payWithApp&isScanQR=true..."
// }

// 7. Save to database
await prisma.payment.create({
  data: {
    order_id: 'ORD-2026-001',
    partner_code: 'MOMO',
    request_id: 'MOMO1770140223906',
    amount: 150000,
    order_info: 'Thanh toán ORD-2026-001',
    payment_method: 'momo',
    status: 'pending'
  }
});
```

---

#### **Bước 6-9: User thanh toán**

**Frontend - Redirect đến MoMo:**
```typescript
// Option 1: Redirect trực tiếp
window.location.href = result.payUrl;

// Option 2: Hiển thị QR code page
window.location.href = `/payment/momo/qr/${order.order_number}`;
```

**Trang QR code (Backend render HTML):**
```
http://localhost:4000/payment/momo/qr/ORD-2026-001

Hiển thị:
- ✅ Số tiền: 150,000₫
- ✅ Mã đơn hàng: ORD-2026-001
- ✅ QR Code URL (để quét)
- ✅ Button "Mở MoMo App" (deeplink)
- ✅ Hướng dẫn thanh toán
- ✅ Auto refresh mỗi 5s để check status
```

**MoMo Payment Page:**
```
https://test-payment.momo.vn/v2/gateway/pay?t=...

User có 3 cách thanh toán:
1. Quét QR code bằng MoMo app
2. Click button "Thanh toán" → mở app
3. Nhập số điện thoại → OTP
```

**Trong MoMo App:**
```
1. App hiển thị thông tin:
   - Số tiền: 150,000₫
   - Nội dung: Thanh toán ORD-2026-001
   - Người nhận: Merchant Name

2. User xác nhận:
   - Nhập PIN / Vân tay / Face ID
   
3. MoMo xử lý:
   - Trừ tiền trong ví
   - Tạo transaction ID
   - Gửi thông báo cho Backend (IPN)
```

---

#### **Bước 10-13: MoMo IPN Callback (QUAN TRỌNG NHẤT)**

**MoMo Server → Backend:**
```http
POST http://localhost:4000/payment/momo/callback
Content-Type: application/json

{
  "partnerCode": "MOMO",
  "orderId": "ORD-2026-001",
  "requestId": "MOMO1770140223906",
  "amount": 150000,
  "orderInfo": "Thanh toán ORD-2026-001",
  "orderType": "momo_wallet",
  "transId": "2345678901",          // ⭐ Transaction ID từ MoMo
  "resultCode": 0,                  // ⭐ 0 = Success, khác 0 = Failed
  "message": "Successful.",
  "payType": "qr",                  // qr, app, web
  "responseTime": 1770140223576,
  "extraData": "",
  "signature": "19fc00cff915a4d0f614855b5cc838b4452d0d57e027b9c3fb4766e8780f2afc"
}
```

**Backend - PaymentService.handleCallback():**
```typescript
// 1. Verify signature (BẮT BUỘC - Security)
const rawSignature = [
  `accessKey=${accessKey}`,
  `amount=${amount}`,
  `extraData=${extraData}`,
  `message=${message}`,
  `orderId=${orderId}`,
  `orderInfo=${orderInfo}`,
  `orderType=${orderType}`,
  `partnerCode=${partnerCode}`,
  `payType=${payType}`,
  `requestId=${requestId}`,
  `responseTime=${responseTime}`,
  `resultCode=${resultCode}`,
  `transId=${transId}`
].join('&');

const expectedSignature = crypto
  .createHmac('sha256', secretKey)
  .update(rawSignature)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid signature - Possible hack attempt!');
}

// 2. Update Payment status
await prisma.payment.update({
  where: { request_id: 'MOMO1770140223906' },
  data: {
    status: resultCode === 0 ? 'completed' : 'failed',
    trans_id: '2345678901',
    pay_type: 'qr',
    result_code: 0,
    result_message: 'Successful.',
    response_time: new Date(1770140223576)
  }
});

// 3. Update Order status (nếu thanh toán thành công)
if (resultCode === 0) {
  await prisma.order.update({
    where: { order_number: 'ORD-2026-001' },
    data: {
      status: 'confirmed',          // pending → confirmed
      payment_method: 'momo',
      payment_status: 'paid'         // unpaid → paid
    }
  });

  // 4. Có thể gửi email/notification
  await sendOrderConfirmationEmail(order);
}

// 5. Response to MoMo (BẮT BUỘC)
return {
  success: true,
  message: 'Callback processed successfully'
};
```

---

#### **Bước 14: Redirect User về Frontend**

**MoMo Payment Page → Frontend:**
```
Sau khi thanh toán xong (thành công hoặc thất bại)
MoMo tự động redirect về:

http://localhost:3000/payment/success?orderId=ORD-2026-001&resultCode=0
```

**Frontend - Payment Success Page:**
```typescript
// /payment/success
const PaymentSuccess = () => {
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Polling để check order status
    const checkOrder = async () => {
      const response = await fetch(`/orders/order-number/${orderId}`);
      const data = await response.json();
      setOrder(data);
      
      // Nếu payment_status = 'paid' → Success
      if (data.payment_status === 'paid') {
        showSuccessMessage();
      }
    };

    // Check mỗi 2 giây (vì IPN callback có thể chậm hơn redirect)
    const interval = setInterval(checkOrder, 2000);
    checkOrder();

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div>
      {order?.payment_status === 'paid' ? (
        <>
          <h1>✅ Thanh toán thành công!</h1>
          <p>Đơn hàng: {orderId}</p>
          <p>Số tiền: {order.total_amount.toLocaleString()}₫</p>
          <p>Trạng thái: Đã xác nhận</p>
          <button onClick={() => navigate('/orders')}>
            Xem đơn hàng
          </button>
        </>
      ) : (
        <>
          <h1>⏳ Đang xử lý thanh toán...</h1>
          <Spinner />
        </>
      )}
    </div>
  );
};
```

---

### ⚠️ Các vấn đề quan trọng

#### **1. IPN vs Redirect - Ai tin cậy hơn?**

```
❌ KHÔNG NÊN:
Frontend redirect → Update order status
Lý do: User có thể tắt browser trước khi redirect

✅ NÊN:
IPN Callback → Update order status
Lý do: MoMo gọi trực tiếp Backend, đáng tin cậy
```

#### **2. Race Condition:**

```
Scenario: IPN đến trước redirect

Timeline:
T+0s: User xác nhận thanh toán
T+1s: MoMo gửi IPN → Backend cập nhật order → Status = 'paid'
T+3s: MoMo redirect → Frontend
T+4s: Frontend check order → Thấy status = 'paid' ✅

✅ Frontend phải polling hoặc websocket để real-time update
```

#### **3. Idempotency:**

```typescript
// MoMo có thể gửi IPN nhiều lần (retry)
// Backend phải handle để không update 2 lần

async handleCallback(callbackData) {
  // Check xem đã process chưa
  const payment = await prisma.payment.findUnique({
    where: { request_id: callbackData.requestId }
  });

  if (payment.status === 'completed') {
    // Đã process rồi, return success
    return { success: true, message: 'Already processed' };
  }

  // Chưa process → Tiến hành update
  // ...
}
```

#### **4. Signature Security:**

```typescript
// ⚠️ NẾU SIGNATURE SAI → Có thể bị hack
// Hacker có thể fake IPN callback với resultCode=0

if (signature !== expectedSignature) {
  logger.error('Invalid signature - Possible attack!', {
    receivedSignature: signature,
    expectedSignature,
    orderId: callbackData.orderId
  });
  throw new UnauthorizedException('Invalid signature');
}

// ✅ Chỉ trust IPN sau khi verify signature
```

#### **5. IPN URL phải public:**

```
❌ Development:
http://localhost:4000/payment/momo/callback
→ MoMo không gọi được

✅ Development với ngrok:
https://abc123.ngrok.io/payment/momo/callback
→ MoMo gọi được ✅

✅ Production:
https://api.yoursite.com/payment/momo/callback
→ Phải HTTPS ✅
```

---

### 🧪 Testing Flow

**Test Complete Flow:**

```bash
# 1. Start ngrok (để nhận IPN callback)
ngrok http 4000

# 2. Update .env
MOMO_IPN_URL="https://abc123.ngrok.io/payment/momo/callback"

# 3. Restart server
npm run start:dev

# 4. Tạo payment
curl -X POST http://localhost:4000/payment/momo/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-001",
    "amount": 50000,
    "orderInfo": "Test payment"
  }'

# 5. Mở QR page
open http://localhost:4000/payment/momo/qr/TEST-001

# 6. Quét QR bằng MoMo app

# 7. Check logs → nhận IPN callback
# [PaymentService] Received MoMo callback: {...}
# [PaymentService] Order TEST-001 confirmed and payment completed

# 8. Check database
# Order: status = 'confirmed', payment_status = 'paid'
# Payment: status = 'completed', trans_id = '...'
```

---

### 📊 Error Codes

| resultCode | Ý nghĩa | Action |
|-----------|---------|--------|
| 0 | Success | Update order = confirmed |
| 9000 | Giao dịch thất bại | Order vẫn pending |
| 1000 | Đang xử lý | Chờ callback tiếp |
| 1001 | Không đủ tiền | Show error |
| 1002 | Bị từ chối | Show error |
| 1003 | User hủy | Order cancelled |
| 1004 | Sai OTP quá nhiều | Show error |
| 1005 | QR hết hạn | Tạo payment mới |

---

### 2. Xử lý trong code

**Tại Orders Controller:**
```typescript
// Sau khi tạo order thành công
const order = await this.ordersService.createFromCart(dto, userId);

// Redirect đến trang thanh toán
return {
  order,
  message: 'Đơn hàng đã được tạo. Vui lòng thanh toán.',
  nextStep: 'payment',
  paymentUrl: `/payment/momo/create?orderId=${order.order_number}&amount=${order.total_amount}`
};
```

**Tại Frontend:**
```typescript
// Sau khi tạo order
const response = await createOrder(orderData);

if (response.nextStep === 'payment') {
  // Gọi API tạo thanh toán MoMo
  const paymentResponse = await fetch('/payment/momo/create', {
    method: 'POST',
    body: JSON.stringify({
      orderId: response.order.order_number,
      amount: response.order.total_amount,
      orderInfo: `Thanh toán đơn hàng ${response.order.order_number}`
    })
  });
  
  const { payUrl } = await paymentResponse.json();
  
  // Redirect đến trang thanh toán MoMo
  window.location.href = payUrl;
}
```

## Testing

### 1. Test với MoMo Test Environment
- Sử dụng credentials test (đã cấu hình sẵn trong .env)
- Test payUrl sẽ dẫn đến trang test của MoMo
- Không cần số điện thoại thật để test

### 2. Test IPN Callback
Để test IPN callback trong development:

**Sử dụng ngrok:**
```bash
# Cài đặt ngrok
npm install -g ngrok

# Expose local server
ngrok http 4000

# Copy HTTPS URL và cập nhật vào .env
MOMO_IPN_URL = "https://your-ngrok-url.ngrok.io/payment/momo/callback"
```

### 3. Test Postman

**Tạo thanh toán:**
```
POST http://localhost:4000/payment/momo/create
Content-Type: application/json

{
  "orderId": "ORDER-001",
  "amount": 100000,
  "orderInfo": "Test payment"
}
```

**Query thanh toán:**
```
GET http://localhost:4000/payment/momo/query/ORDER-001
```

## Bảo mật

### 1. Signature Verification
- Tất cả request đến MoMo đều được ký bằng HMAC-SHA256
- Callback từ MoMo cũng được verify signature
- Không bao giờ tin tưởng dữ liệu mà không verify signature

### 2. Environment Variables
- **Không commit** SECRET_KEY vào git
- Sử dụng .env và thêm vào .gitignore
- Production credentials phải được bảo mật tuyệt đối

### 3. HTTPS
- Production **bắt buộc** phải dùng HTTPS
- IPN URL phải là HTTPS
- MoMo sẽ không gọi IPN đến HTTP endpoint trong production

## Xử lý lỗi

### 1. Các mã lỗi thường gặp
- `0`: Thành công
- `9000`: Giao dịch thất bại
- `1000`: Giao dịch được khởi tạo, chờ người dùng xác nhận
- `1001`: Giao dịch thất bại do tài khoản người dùng không đủ tiền
- `1002`: Giao dịch bị từ chối bởi nhà phát hành
- `1003`: Giao dịch bị hủy bởi người dùng
- `1004`: Giao dịch thất bại do vượt quá số lần nhập OTP
- `1005`: Giao dịch thất bại do url hoặc QR code hết hạn
- `1006`: Giao dịch thất bại do người dùng đã xác nhận thanh toán quá muộn

### 2. Xử lý trong code
```typescript
// Trong callback handler
if (resultCode === 0) {
  // Thanh toán thành công
  await updateOrderStatus(orderId, 'confirmed');
} else {
  // Thanh toán thất bại
  await updateOrderStatus(orderId, 'payment_failed');
  // Gửi email thông báo cho khách hàng
}
```

## Production Checklist

- [ ] Đăng ký tài khoản MoMo Business
- [ ] Lấy production credentials
- [ ] Cập nhật MOMO_ENDPOINT sang production
- [ ] Cấu hình HTTPS cho IPN URL
- [ ] Test kỹ lưỡng trên test environment
- [ ] Chuẩn bị xử lý retry cho IPN failed
- [ ] Setup monitoring và logging
- [ ] Chuẩn bị quy trình hoàn tiền (refund)

## Tài liệu tham khảo

- [MoMo Developer Documentation](https://developers.momo.vn)
- [MoMo Business Registration](https://business.momo.vn)
- [GitHub Examples](https://github.com/momo-wallet/payment)

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong console
2. Verify signature đang được tính đúng
3. Đảm bảo IPN URL accessible từ internet
4. Check MoMo Developer docs
5. Liên hệ MoMo support nếu cần

## Các bước tiếp theo

1. **Cải thiện Orders Service:**
   - Thêm option thanh toán khi checkout
   - Tự động tạo payment request sau khi tạo order
   - Xử lý timeout thanh toán

2. **Thêm tính năng:**
   - Refund (hoàn tiền)
   - Payment history
   - Payment notifications
   - Multiple payment methods

3. **Frontend Integration:**
   - Trang chọn phương thức thanh toán
   - Trang xác nhận thanh toán
   - Trang payment success/failure
   - Real-time payment status update

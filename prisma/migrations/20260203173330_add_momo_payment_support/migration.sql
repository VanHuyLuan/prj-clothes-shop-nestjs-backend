-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'unpaid';

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "partner_code" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "order_info" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trans_id" TEXT,
    "pay_type" TEXT,
    "result_code" INTEGER,
    "result_message" TEXT,
    "extra_data" TEXT,
    "response_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_request_id_key" ON "public"."Payment"("request_id");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("order_number") ON DELETE RESTRICT ON UPDATE CASCADE;

await prisma.$transaction(async (tx) => {
  // 1. Xóa giỏ hàng.
  const cart = await tx.cartItem.deleteMany();
  console.log("CartItem:", cart.count);

  // 2. Xóa chi tiết chứng từ kho.
  const documentItems = await tx.inventoryDocumentItem.deleteMany();
  console.log("InventoryDocumentItem:", documentItems.count);

  // 3. Xóa chứng từ kho.
  const documents = await tx.inventoryDocument.deleteMany();
  console.log("InventoryDocument:", documents.count);

  // 4. Xóa thanh toán.
  const payments = await tx.payment.deleteMany();
  console.log("Payment:", payments.count);

  // 5. Xóa đơn hàng.
  const orders = await tx.order.deleteMany();
  console.log("Order:", orders.count);

  // 6. Xóa địa chỉ.
  const addresses = await tx.address.deleteMany();
  console.log("Address:", addresses.count);

  // 7. Xóa sản phẩm.
  const products = await tx.product.deleteMany();
  console.log("Product:", products.count);
});
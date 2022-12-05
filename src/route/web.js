import express from 'express';
import homeController from '../controller/homeController';
let router = express.Router();

let loggedId = undefined;

const initWebRoute = (app) => {
  router.post('/auth', homeController.authenticate);

  router.get('/', homeController.home);
  
  router.get('/login', homeController.guestLogin);
  router.get('/sign-up', homeController.guestSignup);
  router.post('/sign-up', homeController.createNewUser);
  router.get('/logout', homeController.getLogout);

  router.get('/users', homeController.userInfo);
  router.get('/users/:name', homeController.getUserByName);
  router.post('/delete-user', homeController.deleteUser);
  router.get('/edit-user/:username', homeController.editUser);
  router.post('/edit-info/', homeController.editInfo);

  router.get('/upload', homeController.getUpload);
  router.post('/upload-avatar', homeController.uploadAvatar);

  router.get('/cart', homeController.getCart);
  router.get('/orders' , homeController.getOrders);

  router.post('/add-to-cart', homeController.addToCart);
  router.post('/update-quantity', homeController.updateQuantity);
  router.post('/delete-cart-item', homeController.deleteCartItem);

  router.post('/create-order', homeController.createOrder);
  router.get('/orders/:orderId', homeController.getOrderDetail);

  router.post('/cancel-order', homeController.cancelOrder);
  router.post('/confirm-order', homeController.confirmOrder);
  router.post('/receive-order', homeController.receiveOrder);

  router.get('/pending', homeController.ordersPending);
  router.get('/confirmed', homeController.ordersConfirmed);
  router.get('/cancelled', homeController.ordersCancelled);
  router.get('/shipping', homeController.ordersShipping);
  router.get('/received', homeController.ordersReceived);

  router.get('/sell', homeController.storeList);
  router.post('/create-store', homeController.createStore);

  router.get('/sell/:storeId', homeController.storeDetail);
  router.post('/ship-product', homeController.shipProduct);

  router.get('/add-product/', homeController.productAdd);
  router.post('/create-product/', homeController.createProduct);

  router.get('/current-products/:storeId', homeController.distributionCurrent);
  router.post('/increase-product', homeController.increaseProduct);
  router.post('/change-price', homeController.changePrice);

  router.get('/new-distributions/:storeId', homeController.distributionAdd);
  router.post('/init-distri/:storeId', homeController.importProduct);

  router.post('/search/', homeController.searchProduct);
  router.post('/add-store', homeController.addStore);

  router.post('/add-tag', homeController.addTag);
  router.get('/sort/:tag', homeController.sortProduct);
  router.post('/view-tag', homeController.viewTag);
  router.post('/remove-tag', homeController.removeTag);

  router.get('/manage-voucher/:storeId', homeController.voucherManage);
  router.post('/voucher-vis', homeController.voucherVis);

  router.get('/vouchers', homeController.getVouchers);
  router.post('/submit-voucher', homeController.submitVoucher);
  
  router.get('/add-voucher/:storeId', homeController.voucherAdd);
  router.post('/create-voucher', homeController.createVoucher);

  router.get('/approve-distributions', homeController.administration);
  router.post('/approve', homeController.adminApprove);


  return app.use('/', router);
}

export default initWebRoute;
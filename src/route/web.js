import express from 'express';
import homeController from '../controller/homeController';
let router = express.Router();

let loggedId = undefined;

const initWebRoute = (app) => {
  router.post('/auth', homeController.authenticate);

  router.get('/', homeController.getHomepage);
  
  router.get('/login', homeController.getLogin);
  router.get('/sign-up', homeController.getSignUp);
  router.post('/sign-up', homeController.createNewUser);
  router.get('/logout', homeController.getLogout);

  router.get('/users', homeController.getUserList);
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

  router.get('/pending', homeController.getPendingOrders);
  router.get('/confirmed', homeController.getConfirmedOrders);
  router.get('/cancelled', homeController.getCancelledOrders);
  router.get('/shipping', homeController.getShippingOrders);
  router.get('/received', homeController.getReceivedOrders);

  router.get('/sell', homeController.getSell);
  router.post('/create-store', homeController.createStore);

  router.get('/sell/:storeId', homeController.getStoreDetail);
  router.post('/ship-product', homeController.shipProduct);

  router.get('/add-product/', homeController.addProduct);
  router.post('/create-product/', homeController.createProduct);

  router.get('/current-products/:storeId', homeController.getCurrentProduct);
  router.post('/increase-product', homeController.increaseProduct);

  router.get('/new-distributions/:storeId', homeController.getNewDistribution);
  router.post('/init-distri/:storeId', homeController.importProduct);

  return app.use('/', router);
}

export default initWebRoute;
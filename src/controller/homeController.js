import { json } from 'body-parser';
import pool from '../configs/connectDB';

let getHomepage = async (req, res) => {
  const [rows, fields] = await pool.execute(`select * from products inner join distributions on products.productid = distributions.productid
  inner join stores on distributions.storeid = stores.storeid where distributions.status = 'Approved'`);

  const [allTag, f] = await pool.execute(`select distinct type from producttype`);
  
  if (req.session.username === undefined) {
    return res.render('guest.ejs', { dataUser: rows, allTag: allTag });
  }
  else {
    return res.render('index.ejs', { dataUser: rows, username: req.session.username, allTag: allTag });
  }
}

let getLogout = async (req, res) => {
  req.session.username = undefined;
  req.session.loggedin = false;
  return res.redirect('/');
}

let getUserByName = async (req, res) => {
  let name = req.params.name;
  let [user] = await pool.execute(`SELECT * FROM users WHERE username = ?`, [name]);
  return res.send(JSON.stringify(user));
}

let getSignUp = (req, res) => {
  return res.render('signUp.ejs', { err: '' });
}

let getLogin = async (req, res) => {
  return res.render('logIn.ejs', { loginErr: '' });
}

let getUserList = async (req, res) => {
  let username = req.session.username;
  const [rows, fields] = await pool.execute(`select *, users.id as id from users 
natural join accounts
natural join consumers 
left join useraddress on users.id = useraddress.id 
where users.username = ?`,[username]);

  // console.log(rows)

  return res.render('userList.ejs', {dataUser: rows, username: username});
}

let createNewUser = async (req, res) => {
  let { username, password, email, dob, paymentinfo, city, district, street, houseNo  } = req.body;
  console.log(req.body);

  let [check] = await pool.execute(`select * from accounts where username = ? or email = ?`, [username, email]);
  
  if (check.length > 0) {
    return res.render('signUp.ejs', { err: 'Email/Username existed' });
  }
  let [userId] = await pool.execute(`select max(id) as id from users`, [username]);

  await pool.execute('insert into accounts(username, password, email) values(?, ?, ?)',
   [username, password, email]);
  await pool.execute(`insert into users(dob, sFlag, username) values(?, '0', ?)`, [dob, username]);
  await pool.execute(`insert carts (userId, quantity) VALUES(?, '0')`, [userId[0].id+1])
  await pool.execute(`insert into consumers (id, paymentInfo, tier) VALUES(?, ?, 'Silver')`, [userId[0].id+1, paymentinfo])
  await pool.execute(`insert into useraddress (id, city, district, street, houseNo) VALUES (?, ?, ?, ?, ?)`, [userId[0].id+1, city, district, street, houseNo])
  return res.redirect('/login');
}

let deleteUser = async (req, res) => {
  let username = req.body.username;
  await pool.execute(`delete from users where username = ?`, [username]);
  await pool.execute(`delete from accounts where username = ?`, [username]);
  return res.redirect('/users');
}

let editUser = async (req, res) => {
  let username = req.params.username;
  let [user] = await pool.execute(`select *, users.id as id from users 
natural join accounts
natural join consumers 
left join useraddress on users.id = useraddress.id 
where users.username = ?`, [username]);
  return res.render('editInfo.ejs', { dataUser: user[0] })
}

let editInfo = async (req, res) => {
  let { username, dob, paymentinfo, city, district, street, houseNo, newpassword, checkpassword } = req.body;
  // console.log(req.body)

  let [check] = await pool.execute(`select * from accounts where username = ?`, [username]);
  
  if (checkpassword !== check[0].password) {
    return res.send(`Mật khẩu không đúng`);
  }
  else {

    // await pool.execute(`update accounts set email = ? where email = ?`, 
    // [email, check[0].email]);
    await pool.execute(`update users set dob = cast (? as date) where username = ?`, 
    [dob, check[0].username]);
    await pool.execute(`update useraddress set city = ?, district = ?, street = ?, houseNo = ? where id = (select id from users where username = ?)`,
    [city, district, street, houseNo, username])
    await pool.execute(`update consumers set paymentinfo = ? where id = (select id from users where username = ?)`,[paymentinfo, username])
    await pool.execute(`update accounts set password = ? where username = ?`,[newpassword, username]);

    return res.redirect('/users');
  }
}

let getUpload = async (req, res) => {
  return res.render('uploadFile.ejs');
}

let uploadAvatar = async (req, res) => {

}

let authenticate = async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  
  if (username && password) {
    
    let [result] = await pool.execute(`SELECT * FROM accounts WHERE username = ? AND password = ?`, [username, password]);
      
      if (result.length > 0) {
        
        req.session.loggedin = true;
        req.session.username = username;

        res.redirect('/');
      } else {
        res.render('logIn.ejs', { loginErr: 'Incorrect Username or Password!' });
      }
      res.end();
    }
}

let getCart = async (req, res) => {
  let username = req.session.username;
  let [rows] = await pool.execute(`select * from users inner join
  carts on users.id = carts.userId where users.username = ?`, [username]);

  if (rows.length < 1) {
    await pool.execute(`insert into carts(userId, quantity) values((select id from users where username = ?), '0')`, [username]);
  }

  let check = await pool.execute(`SELECT c.*, p.*, d.*, s.name FROM cartitems c 
inner join distributions d on c.productId = d.productId and c.storeId = d.storeId 
inner join products p on p.productId = c.productId 
inner join stores s on s.storeId = c.storeId where cartId = ?`, [rows[0].cartId]);

  // console.log(check[0]);

  let sum = await pool.execute(`select sum(quantity) as totalQuantity,
sum(quantity*price) as totalPrice FROM cartitems c
inner join distributions d on c.productId = d.productId and c.storeId = d.storeId 
where cartId = ?`, [rows[0].cartId])

  // console.log(sum[0]);

  return res.render('cart.ejs', { cartData: check[0] ,username: username, sum: sum[0]});
}

let getOrders = async (req, res) => {
  let username = req.session.username;

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?)`, [username]);
  // console.log(rows);

  return res.render('orders.ejs', { orderData: rows, username: username });
}

let addToCart = async (req, res) => {
  let { storeid, productid } = req.body;
  let username = req.session.username;
  let [check] = await pool.execute(`select * from carts where userId = (select id from users where username = ?)`, [username]);
  
  let [avai] = await pool.execute(`select * from cartitems where cartid = ? and (storeid = ? and productid = ?)`, [check[0].cartId, storeid, productid]);
  
  let [inStock] = await pool.execute(`select quantityinstock from distributions where storeid = ? and productid = ?`, [storeid, productid]);

  if (avai.length < 1) {
    await pool.execute(`insert into cartitems(cartid, storeid, productid, quantity) values(?, ?, ?, '1')`, [check[0].cartId, storeid, productid]);
  }
  else if (avai[0].quantity < inStock[0].quantityinstock){
    await pool.execute(`update cartitems set quantity = ? where 
    cartid = ? and (storeid = ? and productid = ?)`, [avai[0].quantity + 1, check[0].cartId, storeid, productid]);
  }

  return res.redirect('/cart');
}

let updateQuantity = async (req, res) => {
  let { newQuantity,instock, cartid, storeid, productid } = req.body;

  if (newQuantity >= 1 && parseInt(newQuantity) <= parseInt(instock)) {
    await pool.execute(`update cartitems set quantity = ? where 
    cartid = ? and storeid = ? and productid = ?`, [newQuantity, cartid, storeid, productid]);
  }
  return res.redirect('/cart');
}

let deleteCartItem = async (req, res) => {
  let { cartid, storeid, productid } = req.body;
  await pool.execute(`delete from cartitems where cartid = ? and storeid = ? and productid = ?`, [cartid, storeid, productid]);
  return res.redirect('/cart');
}

let createOrder = async (req, res) => {
  // let { totalQuantity, totalPrice, cartId } = req.body;

  let username = req.session.username;
  let [rows] = await pool.execute(`select * from carts where userId = (select id from users where username = ?)`, [username]);
  
  let [sum] = await pool.execute(`select sum(quantity) as totalQuantity,
sum(quantity*price) as totalPrice FROM cartitems c
inner join distributions d on c.productId = d.productId and c.storeId = d.storeId 
where cartId = ?`, [rows[0].cartId])
  let cartId = rows[0].cartId;
  let totalQuantity = sum[0].totalQuantity;
  let totalPrice = sum[0].totalPrice;

  // tao order rong truoc

  await pool.execute(`insert into orders(userId, cartId, status, totalQuantity, shippingFee, totalPrice) values((select userId from carts where cartid = ?), ?, 'Pending', ?, ?, ?)`,
    [cartId, cartId, totalQuantity, parseFloat(totalPrice * 0.1).toFixed(2), parseFloat(totalPrice * 1.1).toFixed(2)]);

  // tao orderitem sau
  let [result, f] = await pool.execute(`select * from cartitems where cartId = ?`, [cartId]);

  let [orderId] = await pool.execute(`select max(orderId) as max from orders where cartId = ?`, [cartId]);


  for (let i=0; i<result.length; i++) {
    await pool.execute(`insert into orderitems(orderId, storeId, productId, quantity) values(?, ?, ?, ?)`,
    [orderId[0].max, result[i].storeId, result[i].productId, result[i].quantity]);
    await pool.execute(`update distributions set quantityinstock = quantityinstock - ? where storeId = ? and productId = ?`,[result[i].quantity, result[i].storeId, result[i].productId]);
  }

  return res.redirect('/orders');
}

let getOrderDetail = async (req, res) => {
  let username = req.session.username;
  let orderId = req.params.orderId;

  let [order] = await pool.execute(`select d.price, s.name, o.quantity, p.productName from orderitems o
inner join products p on o.productId = p.productId
inner join distributions d on d.productId = o.productId and d.storeId = o.storeId
inner join stores s on o.storeId = s.storeId
where orderid = ?`, [orderId]);

  let [sum] = await pool.execute(`select totalQuantity, shippingFee, totalPrice, orderId, voucherId from orders where orderId = ?`, [orderId]);
  // console.log(sum)
  // console.log(order)
  let [code, f] = await pool.execute(`select code, v.voucherId from vouchers v inner join orders o on v.voucherId = o.voucherId where orderId = ?`, [orderId]);
  
  if (code.length > 0) {
    return res.render('orderDetail.ejs', { orderDetail: order, sum: sum, username: username, code: code[0].code, voucherId: code[0].voucherId });
  }
  else {
    return res.render('orderDetail.ejs', { orderDetail: order, sum: sum, username: username, code: 'Code', voucherId: 'Id' });
  }
  
}

let cancelOrder = async (req, res) => {
  let orderId = req.body.orderId;
  // console.log(orderId);
  let [check] = await pool.execute(`select status from orders where orderId = ?`, [orderId]);

  if (check[0].status == 'Pending') {
    await pool.execute(`update orders set status = 'Cancelled' where orderId = ?`, [orderId]);
    
    let [result, f] = await pool.execute(`select * from orderitems where orderId = ?`, [orderId]);


  for (let i=0; i<result.length; i++) {
    await pool.execute(`update distributions set quantityinstock = quantityinstock + ? where storeId = ? and productId = ?`,[result[i].quantity, result[i].storeId, result[i].productId]);
  }
    
  }
  return res.redirect('/orders');
}

let confirmOrder = async (req, res) => {
  let orderId = req.body.orderId;
  let [check] = await pool.execute(`select status from orders where orderId = ?`, [orderId]);

  if (check[0].status == 'Pending') {
    await pool.execute(`update orders set status = 'Confirmed' where orderId = ?`, [orderId]);

    await pool.execute(`update orderitems set status = 'Confirmed' where orderId = ?`, [orderId]);
  }
  return res.redirect('/orders');
}

let receiveOrder = async (req, res) => {
  let orderId = req.body.orderId;
  let [check] = await pool.execute(`select status from orders where orderId = ?`, [orderId]);

  if (check[0].status == 'Shipping') {
    await pool.execute(`update orders set status = 'Received' where orderId = ?`, [orderId]);
    await pool.execute(`update orders set receiveDate = ? where orderId = ?`, [new Date().toISOString().slice(0, 10) ,orderId]);
    await pool.execute(`update orderitems set status = 'Received' where orderId = ?`, [orderId]);
  }
  return res.redirect('/orders');
}

let getPendingOrders = async (req, res) => {
  let username = req.session.username;

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Pending'`, [username]);
  // console.log(rows);

  return res.render('pendingOrder.ejs', { pendingData: rows, username: username });
}

let getConfirmedOrders = async (req, res) => {
  let username = req.session.username;

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Confirmed'`, [username]);
  // console.log(rows);

  return res.render('confirmedOrder.ejs', { confirmedData: rows, username: username });
}

let getCancelledOrders = async (req, res) => {
  let username = req.session.username;

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Cancelled'`, [username]);

  return res.render('cancelledOrder.ejs', { cancelledData: rows, username: username });
}


let getShippingOrders = async (req, res) => {
  let username = req.session.username;
  let [pre, f] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Confirmed'`, [username]);

  

  for (let i=0; i<pre.length; i++) {
    let ship = true
    let [order, f] = await pool.execute(`select status from orderitems where orderId = ?`, [pre[i].orderId]);
    for (let j=0; j<order.length; j++) {
      // console.log(order[j].status)
      if (order[j].status != 'Shipping') {
        ship = false;
      }
    }
    if (ship) {
      await pool.execute(`update orders set status = 'Shipping' where orderId = ?`, [pre[i].orderId]);

      await pool.execute(`update orders set shipDate = ? where orderId = ?`, [new Date().toISOString().slice(0, 10) ,pre[i].orderId]);
    }
  }

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Shipping'`, [username]);
  // console.log(rows);

  return res.render('shippingOrders.ejs', { shippingData: rows, username: username });
}

let getReceivedOrders = async (req, res) => {
  let username = req.session.username;

  let [rows] = await pool.execute(`select * from orders where userId = (select id from users where username = ?) and status = 'Received'`, [username]);
  // console.log(rows);

  return res.render('receivedOrders.ejs', { receivedData: rows, username: username });
}

let getSell = async (req, res) => {
  let username = req.session.username;

  let [check] = await pool.execute(`select sFlag from users where username = ?`, [username]);


  if (!check[0].sFlag) {
    return res.render('sellRegist.ejs', { username: username, err: '' });
  }
  else {
    let [seller] = await pool.execute(`select sellerid from sellers where id = (select id from users where username = ?)`, [username]);
    let [rows] = await pool.execute(`select * from stores where sellerId = ?`, [seller[0].sellerid]);
    // console.log(rows);
    return res.render('manageStore.ejs', { storeData: rows, username: username });
  }
}

let addStore = async (req, res) => {
  let username = req.session.username;  
  return res.render('sellRegist.ejs', { username: username, err: '' });
}

let createStore = async (req, res) => {
  let username = req.session.username;
  let { storeName, address, password } = req.body;

  let [check] = await pool.execute(`select password from accounts where username = ?`, [username]);

  if (check[0].password !== password) {
    return res.render('sellRegist.ejs', { username: username, err: 'Incorrect Password' });
  }

  await pool.execute(`update users set sFlag = 1 where username = ?`, [username]);
  
  await pool.execute(`insert into sellers(id) values((select id from users where username = ?))`, [username]);

  let [seller] =  await pool.execute(`select sellerId from sellers where id = (select id from users where username = ?)`, [username]);

  await pool.execute(`insert into stores(name, address, sellerId) values(?, ?, ?)`, [storeName, address, seller[0].sellerId]);
  
  return res.redirect('/sell');
}

let getStoreDetail = async (req, res) => {
  let storeId = req.params.storeId;
  let username = req.session.username;
  let [storeName] = await pool.execute(`select name from stores where storeId = ?`, [storeId]);

  let [store] = await pool.execute(`select o.*, p.productName from orderitems o natural join products p where storeId = ? and status='Confirmed'`, [storeId]);

  return res.render('storeDetail.ejs', { storeData: store, username: username, storeName: storeName[0].name, storeId: storeId });
}

let shipProduct = async (req, res) => {
  let { orderId, productId, storeId } = req.body;

  let [status] = await pool.execute(`select status from orderitems where orderId = ? and productId = ? and storeId = ?`, [orderId, productId, storeId]);

  if (status[0].status == 'Confirmed') {
    await pool.execute(`update orderitems set status = 'Shipping' where orderId = ? and productId = ? and storeId = ?`, [orderId, productId, storeId]);
  }
    return res.redirect('/sell' + '/' + storeId);
}

let productCreate = async (req, res) => {
  return res.render('productCreate.ejs', { username: req.session.username, err: '' });
}

let createProduct = async (req, res) => {
  let username = req.session.username;
  let { name, description, password } = req.body;

  let [check] = await pool.execute(`select password from accounts where username = ?`, [username]);

  if (check[0].password !== password) {
    return res.render('productCreate.ejs', { username: username, err: 'Incorrect Password' });
  }
  else {
    await pool.execute(`insert into products(productName, description) values(?, ?)`, [name, description]);
    // let [pr0] = await pool.execute(`select max(productId) as productId from products`);
    // await pool.execute(`insert into producttype(productId, type) values(?, ?)`, [pr0[0].productId, type]);
  }
  return res.render('productCreate.ejs', { username: username, err: 'Create successfully' });
}

let getCurrentProduct = async (req, res) => {
  let username = req.session.username;
  let storeId = req.params.storeId;
  let [rows] = await pool.execute(`select p.*, d.price, d.quantityInStock, d.storeId, d.status from products p NATURAL join distributions d where storeId = ?;`,[storeId]);
  // console.log(rows);
  let [storeName] = await pool.execute(`select name from stores where storeId = ?`, [storeId]);

  return res.render('currentProduct.ejs', { productData: rows, storeName: storeName[0].name, storeId: storeId,username: username });
}

let increaseProduct = async (req, res) => {
  let { productId, storeId, quantity } = req.body;
  console.log(req.body);
  await pool.execute(`update distributions set quantityInStock = quantityInStock + ? where productId = ? and storeId = ?`, [quantity, productId, storeId]);

  res.redirect('/current-products' + '/' + storeId);

}

let getNewDistribution = async (req, res) => {
  let storeId = req.params.storeId;
  let [allProduct, f] = await pool.execute(`select * from products where productId not in (select productId from distributions where storeId = ?)`,[storeId])  

  let [storeName] = await pool.execute(`select name from stores where storeId = ?`, [storeId]);
  res.render('newDistribution.ejs', { disData: allProduct, storeId: storeId, storeName: storeName[0].name, username: req.session.username });
}

let importProduct = async (req, res) => {
  let { productId, storeId, price, quantity } = req.body;
  await pool.execute(`insert into distributions(productId, storeId, price, quantityInStock) values(?, ?, ?, ?)`, [productId, storeId, price, quantity]);
  res.redirect('/current-products' + '/' + storeId);
}

let searchProduct = async (req, res) => {
  let keyword = req.body.search
  let all = keyword.split(' ');
  let allKey = [...new Set(all)]
  let result = []

  for (let i=0; i<allKey.length; i++) {
    const [rows, fields] = await pool.execute(`select * from products inner join distributions on products.productid = distributions.productid
  inner join stores on distributions.storeid = stores.storeid where products.productname like ? or stores.name like ?`, ['%' + allKey[i] + '%', '%' + allKey[i] + '%']);
    result = result.concat(rows);
  }
  let row = [...new Set(result)];
  
  if (req.session.username === undefined) {
    return res.render('guest.ejs', { dataUser: row });
  }
  else {
    return res.render('index.ejs', { dataUser: row, username: req.session.username });
  }
}

let addTag = async (req, res) => {
  let { tag, productId, storeId } = req.body;
  await pool.execute(`insert into producttype(productId, storeId, type) values(?, ?, ?)`, [productId, storeId, tag]);
  res.redirect('/current-products' + '/' + storeId);
}

let sortProduct = async (req, res) => {
  let tag = req.params.tag;

  const [rows, fields] = await pool.execute(`select * from products natural join distributions natural join stores natural join producttype where distributions.status = 'Approved' and type = ?`, [tag]);

  const [allTag, f] = await pool.execute(`select distinct type from producttype`);

  if (req.session.username === undefined) {
    return res.render('guest.ejs', { dataUser: rows, allTag: allTag });
  }
  else {
    return res.render('index.ejs', { dataUser: rows, username: req.session.username, allTag: allTag });
  }
  
}

let getManageVoucher = async (req, res) => {
  let storeId = req.params.storeId;
  let [storeName] = await pool.execute(`select name from stores where storeId = ?`, [storeId]);
  let [voucher] = await pool.execute(`select * from vouchers where storeId = ?`, [storeId]);
  return res.render('manageVoucher.ejs', { voucherData: voucher, storeId: storeId, storeName: storeName[0].name, username: req.session.username });
}

let voucherVis = async (req, res) => {
  let { storeId, voucherId, vis, status } = req.body;
  
  if (status == "Available") {
    if (vis == "Private") {
      await pool.execute(`update vouchers set visibility = 'Public' where voucherId = ?`, [voucherId]);
    }
    else {
      await pool.execute(`update vouchers set visibility = 'Private' where voucherId = ?`, [voucherId]);
    }
  }
  res.redirect('/manage-voucher' + '/' + storeId);
}

let submitVoucher = async (req, res) => {
  let { orderId, voucherId, code } = req.body;
  let [firstOrder, f] = await pool.execute(`select d.storeId, d.price, o.quantity from orderitems o 
  inner join distributions d 
  on o.productId = d.productId and o.storeId = d.storeId 
  where o.orderId = ?`, [orderId]);
  let [oldPrice] = await pool.execute(`select totalPrice, shippingFee from orders where orderId = ?`, [orderId]);

  let [check1, f1] = await pool.execute(`select voucherId from orders where orderId = ?`, [orderId]);
  let [check2, f2] = await pool.execute(`select * from vouchers where voucherId = ? and code = ?`, [voucherId, code]);
  // console.log(check1[0].voucherId == null)
  // console.log(check2[0].visibility == "Public")
  // console.log(check2[0].status == "Available")
  // console.log(new Date(check2[0].expiryDate) > new Date());
  
  let totalPrice = 0

  if (check1[0].voucherId == null && check2.length > 0) {
    let storeId = check2[0].storeId;
    let rate = check2[0].discountRate;
    let shippingFee = oldPrice[0].shippingFee;
    
    if (check2[0].visibility == "Public" && check2[0].status == "Available" && new Date(check2[0].expiryDate) > new Date()) {
      for (let i=0; i<firstOrder.length; i++) {
        if (firstOrder[i].storeId == storeId) {
          totalPrice += (firstOrder[i].price*(100-rate)/100)*firstOrder[i].quantity;
        }
        else {
          totalPrice += firstOrder[i].price*firstOrder[i].quantity;
        }
      }
      totalPrice += shippingFee
      await pool.execute(`update orders set totalPrice = ?, voucherId = ? where orderId = ?`, [parseFloat(totalPrice), voucherId, orderId]);
      await pool.execute(`update vouchers set status = 'Used' where voucherId = ?`, [voucherId]);
    }
  }

  return res.redirect('/orders/' + orderId);
}

let getVouchers = async (req, res) => {
  let [voucherData, f] = await pool.execute(`select * from vouchers where status = 'Available' and visibility = 'Public'`);
  return res.render('voucher.ejs', { voucherData: voucherData, username: req.session.username });
}

let addVoucher = async (req, res) => {

  return res.render('addVoucher.ejs', { username: req.session.username, storeId: req.params.storeId, err: '' });
}

let createVoucher = async (req, res) => {
  let { storeId, code, discountRate, expiryDate, password } = req.body; 
//  console.log(storeId, code, discountRate, expiryDate, password);

  let [pass, f] = await pool.execute(`select password from accounts where username = ?`, [req.session.username]);
  // console.log(pass[0].password)

  if (discountRate > 100 || discountRate < 0) {
    return res.render('addVoucher.ejs', { username: req.session.username, storeId: storeId, err: 'Discount rate must be between 0 and 100' });
  }
  else if (new Date(expiryDate) < new Date()) {
    return res.render('addVoucher.ejs', { username: req.session.username, storeId: storeId, err: 'Expiry date must be in the future' });
  }
  else if (password !== pass[0].password) {
    return res.render('addVoucher.ejs', { username: req.session.username, storeId: storeId, err: 'Password incorrect' });
  }
  else {
    await pool.execute(`insert into vouchers (storeId, code, discountRate, expiryDate, visibility, status) values (?, ?, ?, ?, 'Private', 'Available')`, [storeId, code, discountRate, expiryDate]);
    return res.redirect('/manage-voucher' + '/' + storeId);
  }
}

module.exports = {
  getHomepage, getUserByName, getSignUp, createNewUser, getUserList,
  deleteUser, editUser, editInfo, getUpload, getLogin,
  uploadAvatar, authenticate, getLogout, getCart, getOrders,
  addToCart, updateQuantity, deleteCartItem, createOrder,
  getOrderDetail, cancelOrder, confirmOrder, receiveOrder,
  getPendingOrders, getConfirmedOrders, getCancelledOrders,
  getSell, getShippingOrders, getReceivedOrders,
  createStore, getStoreDetail, shipProduct, productCreate,
  createProduct, getCurrentProduct, increaseProduct,
  getNewDistribution, importProduct, searchProduct,
  addStore, addTag, sortProduct, getManageVoucher,
  voucherVis, submitVoucher, getVouchers, addVoucher,
  createVoucher
}
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = '1234'

const hashedPass = bcrypt.hashSync(myPlaintextPassword, saltRounds);

console.log(hashedPass)
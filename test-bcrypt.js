const bcrypt = require('bcryptjs');

async function test() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    console.log('Hash produced:', hash);
    const match = await bcrypt.compare('123456', hash);
    console.log('Match result:', match);
  } catch (err) {
    console.error('Bcrypt error:', err);
  }
}

test();

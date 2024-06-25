module.exports = (fn) => {
    console.log('');
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  };
  
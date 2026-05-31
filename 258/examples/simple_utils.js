function calculateSum(a, b) {
  return a + b;
}

function fetchData(userId) {
  var response = fetch('https://api.example.com/users/' + userId);
  return response;
}

function Calculator(initialValue) {
  this.value = initialValue || 0;
}

Calculator.prototype.add = function(amount) {
  this.value += amount;
  return this.value;
};

Calculator.prototype.multiply = function(factor) {
  if (factor === 0) {
    return 0;
  }
  this.value *= factor;
  return this.value;
};

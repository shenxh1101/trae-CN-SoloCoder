import axios from 'axios';

export function calculateSum(a, b) {
  return a + b;
}

export async function fetchUserData(userId) {
  const response = await axios.get(`https://api.example.com/users/${userId}`);
  if (response.status === 200) {
    return response.data;
  }
  return null;
}

export class Calculator {
  constructor(initialValue = 0) {
    this.value = initialValue;
  }

  add(amount) {
    this.value += amount;
    return this.value;
  }

  multiply(factor) {
    if (factor === 0) {
      return 0;
    }
    this.value *= factor;
    return this.value;
  }
}

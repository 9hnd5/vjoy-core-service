const autocannon = require("autocannon");

const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQVBJIGtleSBmb3IgdmpveS10ZXN0IiwidHlwZSI6InZqb3ktdGVzdCIsImVudiI6ImRldiIsImlhdCI6MTY3ODc2NDUwMn0.M75XAarRlM7wfG1CbmlEi2_hQxnOLhcvcweDMY3vfIA";
const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVJZCI6ImFkbWluIiwiaWF0IjoxNjgxNjk4NzY2LCJleHAiOjM4MjkxODI0MTN9.U15mdIIoYc3caISWYLGXCTjg1-ZLTOhvxOEGaRJO32w";

// Define the user flow
const requests = [
  {
    path: "/api/v1/dev/core/auth/signin/email",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-token": API_TOKEN,
    },
    body: JSON.stringify({ email: "phuctran@vus-etsc.edu.vn", password: "123456abcd" }),
  },
  {
    path: "/api/v1/dev/core/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-token": API_TOKEN,
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    setupRequest: (req) => {
      const randomUsername = generateRandomString(10);
      const randomEmail = `load-test-${randomUsername}@vus-etsc.edu.vn`;
      const requestBody = JSON.stringify({
        firstname: `fn-${randomUsername}`,
        lastname: `ln-${randomUsername}`,
        email: randomEmail,
        roleId: "parent",
      });
      req.body = requestBody;
      return req;
    },
  },
  {
    path: "/api/v1/dev/core/users/1",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "api-token": API_TOKEN,
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  },
];

// Function to generate a random string
function generateRandomString(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to execute the user flow
function executeUserFlow() {
  const instance = autocannon({
    url: "https://vus-vjoy-1ap23wxt.an.gateway.dev", // Replace with your API URL
    connections: 100,
    duration: 20, // Test duration in seconds
    requests,
  });

  autocannon.track(instance, { renderProgressBar: true });
  instance.on("done", (result) => {
    console.log("Load test completed!");
    console.log(result);
  });
}

// Start the load test
executeUserFlow();

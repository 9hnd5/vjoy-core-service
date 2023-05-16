const autocannon = require("autocannon");

const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQVBJIGtleSBmb3IgdmpveS10ZXN0IiwidHlwZSI6InZqb3ktdGVzdCIsImVudiI6ImRldiIsImlhdCI6MTY3ODc2NDUwMn0.M75XAarRlM7wfG1CbmlEi2_hQxnOLhcvcweDMY3vfIA";
const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVJZCI6ImFkbWluIiwiaWF0IjoxNjgxNjk4NzY2LCJleHAiOjM4MjkxODI0MTN9.U15mdIIoYc3caISWYLGXCTjg1-ZLTOhvxOEGaRJO32w";

// Define the user flow
const requests = [
  // {
  //   path: "/api/v1/dev/file-uploader",
  //   method: "GET",
  // },
  {
    path: "/api/v1/dev/core/auth/signin/email",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-token": API_TOKEN,
    },
    body: JSON.stringify({ email: "phuctran@vus-etsc.edu.vn", password: "123456abcd" }),
  },
  // {
  //   path: "/api/v1/dev/core/users/1",
  //   method: "GET",
  //   headers: {
  //     "api-token": API_TOKEN,
  //     Authorization: `Bearer ${ACCESS_TOKEN}`,
  //   },
  // },
  // {
  //   path: "/api/v1/dev/content/level-suggestion?filter[dob]=02-09-2000",
  //   method: "GET",
  //   headers: {
  //     "api-token": API_TOKEN,
  //     Authorization: `Bearer ${ACCESS_TOKEN}`,
  //   },
  // },
  // {
  //   path: "/api/v1/dev/content/levels",
  //   method: "GET",
  //   headers: {
  //     "api-token": API_TOKEN,
  //     Authorization: `Bearer ${ACCESS_TOKEN}`,
  //   },
  // },
];

// Function to execute the user flow
function executeUserFlow() {
  const instance = autocannon({
    url: "https://vus-vjoy-1ap23wxt.an.gateway.dev", // Replace with your API URL
    // url: "https://vjoy-file-uploader-dev-qconrzsxya-de.a.run.app",
    connections: 500,
    duration: 10, // Test duration in seconds
    requests,
  });

  autocannon.track(instance, { renderProgressBar: true });
  instance.on("done", (result) => {
    console.log("Load test completed!", new Date());
    console.log(result);
  });
}

// Start the load test
executeUserFlow();

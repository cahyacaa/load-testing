import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const getRequestTrend = new Trend('get_request_duration');
const postRequestTrend = new Trend('post_request_duration');

// const API_BASE_URL = 'http://202.10.36.65:8005/api/v1/user/events?page=1&per_page=9999&search=&sort_field=created_at&sort_direction=asc';
const API_BASE_URL = 'https://google.com';
// const API_BASE_URL = 'http://202.10.36.65:8080/cpu';
const AUTH_TOKEN = '137914|GJZDZ4w8d0dPcxu5G5dQAJpMYUshyICSQowd7x4U';

export const options = {
  scenarios: {
    get_requests: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1 },
        { duration: '10s', target: 1000},
        { duration: '20s', target: 0 },
      ],
      exec: 'getRequests',
    },
    // scenarios: {
    //   constant_rate: {
    //     executor: 'constant-arrival-rate',
    //     rate: 30,
    //     timeUnit: '1s', 
    //     duration: '1m', 
    //     preAllocatedVUs: 100,
    //     maxVUs: 150, 
    //     exec: 'getRequests',
    //   },
    
    // ,
    // post_requests: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '30s', target: 3 },
    //     { duration: '1m', target: 3 },
    //     { duration: '20s', target: 0 },
    //   ],
    //   exec: 'postRequests',
    // },
  },
  thresholds: {
    'http_req_duration{type:GET}': ['p(95)<500'],
    'http_req_duration{type:POST}': ['p(95)<1000'],
    errors: ['rate<0.1'],
  },
};

const params = {
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export function getRequests() {
  const getListResponse = http.get(
    `${API_BASE_URL}`, 
    params
  );
  
  check(getListResponse, {
    'GET items status is 200': (r) => r.status === 200,
    'GET items response is valid': (r) => r.body.length > 0,
  });
  getRequestTrend.add(getListResponse.timings.duration);

  if (getListResponse.status >= 400) {
    errorRate.add(1);
  }
}

export function postRequests() {
  const createPayload = JSON.stringify({
    name: 'Test Item',
    description: 'Created during load test',
    category: 'test'
  });

  const createResponse = http.post(
    `${API_BASE_URL}/items`,
    createPayload,
    params
  );
  
  check(createResponse, {
    'POST create status is 201': (r) => r.status === 201,
    'POST create response has ID': (r) => JSON.parse(r.body).id !== undefined,
  });
  postRequestTrend.add(createResponse.timings.duration);

  const updatePayload = JSON.stringify({
    status: 'updated',
    lastModified: new Date().toISOString()
  });

  const updateResponse = http.post(
    `${API_BASE_URL}/items/1/update`,
    updatePayload,
    params
  );
  
  check(updateResponse, {
    'POST update status is 200': (r) => r.status === 200,
  });
  postRequestTrend.add(updateResponse.timings.duration);

  if (createResponse.status >= 400 || updateResponse.status >= 400) {
    errorRate.add(1);
  }

  sleep(Math.random() * 3 + 2);
}
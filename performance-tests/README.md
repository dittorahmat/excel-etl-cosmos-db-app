# Performance Testing

This directory contains performance tests for the Excel ETL application using Artillery.

## Installation

To run performance tests, first install the required dependencies:

```bash
cd performance-tests
npm install
```

## Running Tests

### Load Testing

To run the API load test:

```bash
npm test
```

This will run a load test scenario that simulates various API endpoints under different load conditions.

### Stress Testing

To run the stress test:

```bash
npm run test:stress
```

This will run a stress test that pushes the system to its limits.

### Generate Reports

To run tests and generate detailed reports:

```bash
npm run test:report
```

This will generate a JSON report and an HTML report in the `reports` directory.

## Test Scenarios

### 1. API Load Test (`api-load-test.yml`)

This scenario tests the API endpoints under normal and peak load conditions:

- Health check endpoint
- Public API endpoint
- Data endpoint
- Fields endpoint

### 2. Stress Test (`stress-test.yml`)

This scenario tests the system under extreme load conditions to identify breaking points.

### 3. File Upload Test (`file-upload-test.yml`)

This scenario tests the file upload functionality under various load conditions.

## Configuration

The test scenarios are configured with:

- **Target**: The base URL for the API
- **Phases**: Different load phases with varying arrival rates
- **Variables**: Dynamic variables used in tests
- **Scenarios**: Different test scenarios

## Reports

Test reports are generated in the `reports` directory:

- JSON reports for detailed analysis
- HTML reports for visual inspection

## CI/CD Integration

Performance tests are automatically run as part of the CI/CD pipeline on a scheduled basis.
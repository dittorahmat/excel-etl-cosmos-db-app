# Mutation Testing

This directory contains configuration for mutation testing using Stryker.

## What is Mutation Testing?

Mutation testing is a technique used to evaluate the quality of software tests. Mutation testing involves modifying a program in small ways (mutations) and then running the tests to see if they fail. If the tests pass, then the mutation is considered "alive" and indicates that the tests are not effective at detecting faults. If the tests fail, then the mutation is "killed" and indicates that the tests are effective.

## Running Mutation Tests

To run mutation tests:

```bash
cd mutation-tests
npm test
```

This will run the mutation tests and generate a report in the `reports/mutation/html` directory.

## Configuration

The mutation testing configuration is defined in `stryker.conf.js`. This configuration specifies:

- Which files to mutate
- Which test runner to use (Vitest)
- Thresholds for mutation score
- Reporters to use

## Interpreting Results

The mutation score is calculated as:

```
Mutation Score = (Killed Mutants / Total Mutants) * 100
```

A higher mutation score indicates better test quality.
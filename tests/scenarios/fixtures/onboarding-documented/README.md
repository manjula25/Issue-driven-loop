# loopsample2

A tiny sample project for the onboarding probe.

## Setup

Install with dev dependencies:

    pip install -e ".[test]"

## Running the tests

    pytest -q

## Fast unit subset

Run just the unit suite without the slow integration tests:

    pytest -q tests/unit/

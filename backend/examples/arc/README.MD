# Case Study: ARC-AGI

Here we showcase how to use PySpur for the ARC challenge, inspired by [Ryan Greenblatt's approach](https://redwoodresearch.substack.com/p/getting-50-sota-on-arc-agi-with-gpt).

* ARC-AGI is an AGI benchmark that consists of unique training and evaluation tasks. * Each task contains input-output examples. The puzzle-like inputs and outputs present a grid where each square can be one of ten colors. A grid can be any height or width between 1x1 and 30x30.

More info can be found [here](https://arcprize.org/guide).

## Some learnings

* The number of train examples can vary from task to task
*

# To-dos

- [ ] ARC-specific
  - [X] Set up data loading
  - [X] Set up feature engineering (grid and ASCII)
  - [ ] Sanitize prompts and grid rendering
  - [ ] Write `eval.py` to evaluate the solutions

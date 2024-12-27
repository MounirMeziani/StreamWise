Engineering Document for Subtle YouTube Usage Management Model

Overview
This document outlines the design and implementation of a Chrome extension aimed at reducing YouTube consumption by subtly enforcing usage limits. The model employs a threshold-based system with random blocking intervals to discourage excessive use without user awareness.

System Description
The extension tracks the user's time spent on YouTube and applies temporary blocks when usage exceeds predefined thresholds. The goal is to influence behavior without causing annoyance or drawing attention to the intervention.

Parameters and Variables
T: Daily usage threshold in minutes (e.g., 120 minutes).

F: Maximum continuous usage allowed without a block (35 minutes).

b: Block duration, randomly selected between 30 seconds and 1 minute.

B_total_max: Maximum total blocking time per day (60 minutes).

t: Total daily usage time.

c: Continuous usage time without a block.

B_total: Accumulated blocking time during the day.

Algorithm
Step-by-Step Instructions
Initialization

Set T, F, B_total_max.

Initialize t, c, B_total to zero.

Ensure data persistence across sessions using Chrome storage API.

Usage Tracking

Monitor the active tab for YouTube URLs.

Record the duration of each YouTube session.

Block Enforcement

For each YouTube session:
a. Increment c by the session duration.
b. If c >= F:
i. Select b randomly between 0.5 and 1 minute.
ii. Enforce a block for b minutes (redirect or display a message).
iii. Reset c to 0.
iv. Add b to B_total, ensuring B_total <= B_total_max.

End-of-Day Check

If t > T:
a. Select b randomly between 0.5 and 1 minute.
b. Enforce an additional block for b minutes.
c. Add b to B_total, ensuring B_total <= B_total_max.

Data Persistence

Save t, c, B_total in Chrome storage.

Reset daily counters at midnight.

Mathematical Model
Block Duration Distribution: b ~ Uniform(0.5, 1) minutes.

Total Blocking Time: B_total = Σb, where B_total <= B_total_max.

Implementation Details
Tracking Usage Time
Use Chrome's API to detect YouTube tabs and track session durations.

Update c and t in real-time.

Enforcing Blocks
Redirect the user to a neutral page or display a message indicating a temporary block.

Use setTimeout for block durations.

User Interface
A simple icon indicating the extension status.

Optionally, provide a popup with usage statistics and reset options.

Privacy Considerations
Ensure no personal data is collected beyond usage time.

Comply with Chrome Web Store policies on data handling.

Technical Stack
Programming Language: JavaScript.

APIs: Chrome Extension API for tab management and storage.

Storage: Use Chrome's storage API for persistent data storage.

Testing
Scenarios:

Usage just below T.

Exceeding T by various margins.

Continuous usage exceeding F multiple times.

Validation:

Ensure blocks are applied correctly.

Verify data persistence across sessions.

Deployment
Package the extension following Chrome Web Store guidelines.

Provide documentation for users and support for engineers.
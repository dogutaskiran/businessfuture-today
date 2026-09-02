Robotics teams can collect enormous volumes of video, sensor readings and control data, yet still struggle to produce training datasets they can trust. Hebbian Robotics, a YC S26 company, is positioning its open-source HFlow SDK as infrastructure for that less-visible part of the robotics stack.

The project processes multimodal recordings from robots and human operators into standardized episodes and queryable dataset manifests. Its focus is not model training itself, but the work that determines whether a training corpus is complete, clean and reproducible.

## From scripts to repeatable processing

According to the founders, robotics data processing often starts as a collection of scripts: one converts video, another validates timestamps, another attaches labels, and another copies selected runs into a dataset. That approach can be workable for an early prototype, but becomes harder to manage as recordings accumulate.

The operational issue is traceability. Teams need to know which code processed a recording, why a particular episode was excluded, and whether they can recreate a given dataset later. Those questions matter when model performance changes and operators need to distinguish between a modeling issue and a change in the underlying data.

HFlow defines a pipeline around transformations, checks, labels and enrichments. Developers write those steps as Python functions that receive an episode and return measurements, artifacts or transformed data. The same functions can run in-process during development and then be packaged as Airflow 3 DAGs for scheduled corpus processing.

That Airflow connection gives teams a familiar operating layer for inspecting task status and logs, handling retries, and rerunning processing jobs. For founders and platform leads, the practical pitch is a path from experimentation to recurring data operations without having to rebuild every processing step in a separate orchestration system.

## Quality control is the initial use case

Hebbian highlights data quality as the first recurring problem. Frozen camera feeds, missing topics, timestamp drift and duplicate recordings can enter a corpus without obvious warnings. In a robotics setting, these are not isolated file defects: video, robot joint states, actions and metadata must often remain aligned for a recording to be useful for training or evaluation.

The SDK currently takes one MCAP file per episode. MCAP is an open container format for timestamped multimodal recordings, with a role similar to a ROS bag. Keeping video, robot state, actions and other sensor streams together is central to HFlow’s design, because pipeline steps need to evaluate those streams in combination rather than as disconnected files.

HFlow writes a canonical MCAP format using in-band H.264 video and grouped camera and state chunks. The company also points to compatibility with Foxglove and Rerun, which could matter for teams already using those tools to inspect or visualize robotics data.

## Why this matters

The robotics industry’s attention is often on new model architectures and hardware demonstrations. But scaling either depends on the reliability of the data loop: collecting recordings, detecting failures, selecting useful examples, labeling them, and producing versionable training sets.

A standardized layer could reduce duplicated internal infrastructure across robotics companies and data providers. It may be particularly relevant for organizations moving beyond a small number of manually reviewed recordings, where ad hoc pipelines become difficult to audit.

## What to watch next

HFlow’s usefulness will depend on how broadly its episode model and checks fit real-world robotics setups. The current one-MCAP-file-per-episode input is a clear convention, but teams with existing storage layouts or heterogeneous sensor systems will need to assess the integration cost.

Operators should also watch for evidence that the SDK makes provenance, exclusion decisions and dataset manifests genuinely easier to use in daily model-development workflows. In robotics, processing infrastructure earns its place when it shortens the cycle between a field recording and a dataset that a team can confidently train on.

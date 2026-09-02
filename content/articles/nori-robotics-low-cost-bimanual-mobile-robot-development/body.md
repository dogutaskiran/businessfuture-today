Nori Robotics has launched a $1,688 bimanual mobile robot designed for developers and researchers—a price point the San Francisco startup argues can make robotics experimentation less dependent on scarce, expensive lab hardware.

The company, founded by Columbia robotics researcher Antonio, says it has shipped its first unit and is building its next batch. Its business model is hardware sales, with optional paid software planned on top. Parts of the hardware are open source, and Nori has published an open SDK with teleoperation and demonstration tools.

## A development platform, not a general-purpose humanoid

Nori is not a legged humanoid. It uses a differential wheeled base and a telescoping lift, paired with two 7+1 degree-of-freedom arms. Each arm has a stated 1.5 kg payload, while the lift is rated for 55 kg.

Its sensing package includes four 720p RGB cameras running at 30 frames per second, 2D lidar and a dual-microphone array for full-duplex voice communication. A 432 Wh battery and Raspberry Pi 5 with 4 GB of RAM are onboard.

The computing split is important for prospective users: Nori runs SLAM and safety functions locally, but heavier workloads—including ACT and vision-language-action models—must run on a computer over a LAN connection or a remote server over WAN.

That makes the system more appropriately understood as an accessible physical endpoint for robotics software development than as a fully self-contained autonomous worker.

## How Nori reached its price target

The startup says it went through seven iterations to get the machine below $2,000. The central design choices were using high-ratio servos instead of quasi-direct-drive motors and replacing legs with wheels.

Those choices involve familiar robotics trade-offs. A wheeled base reduces mechanical complexity and cost relative to dynamic legged locomotion, while potentially limiting the environments the robot can navigate. High-ratio servos similarly help lower costs, but are a different choice from the actuators used in many higher-priced research platforms.

Nori says the platform contains more than 100 moving and structural parts, spanning actuators, bearings, wiring, power delivery and assembly. It assembles units in San Francisco and says the design emphasizes manufacturing and repairability. The company offers 3D files for printing replacement parts.

## Why the price matters

For robotics teams, the stated goal is not simply lower procurement cost. It is the ability to operate more units, run longer tests and collect larger datasets than a lab limited to one or two costly robots could manage.

Nori’s SDK includes tools for teleoperation and human demonstrations, aligning the hardware with workflows used to teach manipulation tasks. The company also provides a browser-based simulator, allowing developers to inspect the platform before acquiring hardware.

Nori says the current hardware can perform basic cleaning tasks, open drawers, restock shelves and pour beer. Its longer-term ambition is to let people without robotics expertise teach tasks and distribute those learned behaviors to other owners.

## What to watch next

The immediate question is whether Nori can deliver repeatable, maintainable hardware at its advertised price as production expands beyond the first shipment. Buyers will also need to assess whether its payload, sensing, wheeled mobility and offboard-compute requirements fit their intended workflows.

For builders, the more consequential test may be ecosystem traction: whether the open SDK, repairable design and relatively low entry price attract enough developers to generate reusable task demonstrations and software. If that happens, Nori’s value could extend beyond the robot itself to the development loop it enables.

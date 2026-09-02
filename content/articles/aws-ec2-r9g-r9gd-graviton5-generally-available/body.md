Amazon Web Services has made its EC2 R9g and R9gd instance families generally available, extending its Graviton5 processor line into memory-optimized cloud workloads.

The instances are aimed at applications where memory capacity and processor performance are central constraints, including databases, in-memory caches and real-time analytics. AWS says the Graviton5-based systems provide up to 25% better compute performance than the preceding R8g instances.

## What changed

R9g and R9gd are the latest memory-optimized EC2 families built on AWS’s Arm-based Graviton processors. Their general availability moves Graviton5 from an option for early adopters to a production infrastructure choice for organizations running suitable workloads on AWS.

The distinction between the two families matters operationally: R9gd adds local NVMe SSD storage, while R9g does not. That gives teams a choice between a configuration focused on memory and network-attached storage patterns and one that can use local high-speed storage where an application benefits from it.

## Why operators should care

For infrastructure teams, the headline is not simply a new processor generation. Memory-intensive services often sit among the more persistent and expensive components of a cloud estate. A performance gain at the instance level can create room to improve throughput, reduce the number of instances needed for a workload, or absorb growth without immediately expanding infrastructure.

The potential beneficiaries are workloads that can run on Arm architecture and are bounded by CPU performance alongside substantial memory needs. That includes database engines, caching tiers and streaming or real-time analytical systems.

But the “up to 25%” figure is a vendor performance claim, not a universal outcome. Actual results will depend on application architecture, database configuration, runtime support, storage behavior and whether a workload is CPU-, memory- or I/O-constrained.

## The migration question

Graviton adoption still requires a compatibility review. Teams using containerized services may find the transition more straightforward if their base images, libraries and dependencies already support Arm64. Organizations with proprietary binaries, older middleware or architecture-specific dependencies will need more planning.

That makes benchmarking the practical next step. Compare R9g or R9gd against existing instances using production-like data and traffic patterns, while measuring latency, throughput, error rates and total cost. For stateful systems, test failover, replication and storage behavior rather than treating the change as a simple compute swap.

## What to watch next

AWS’s continued expansion of Graviton5 across EC2 families raises the stakes for Arm readiness in cloud application design. Builders that maintain multi-architecture build pipelines and validate Arm support across their software stack will have more flexibility as new instance generations arrive.

For buyers, the immediate question is narrower: whether the performance profile of R9g or R9gd changes the economics of a specific memory-heavy production workload. The answer will come from workload-level tests, not from instance-family labels alone.

# Area 8 - Unit Economics, Scaling, and Break-even

## Unit economics framework

Define:

- $C_v$ = variable LLM cost per workflow run
- $C_f$ = fixed platform cost allocated per run
- $P$ = price charged per run (or internal value capture per run)

Gross margin per run:

$$
GM = P - (C_v + C_f)
$$

Break-even volume for fixed monthly overhead $F$:

$$
N_{BE} = \frac{F}{P - C_v}
$$

## Sensitivity to token inflation

If loops/retries/context bloat increase variable cost by factor $k$:

$$
C_v' = k\cdot C_v
quad\Rightarrow\quad
N_{BE}' = \frac{F}{P - k\cdot C_v}
$$

As $k\cdot C_v$ approaches $P$, break-even becomes unstable or impossible.

## Scenario table

Assume baseline:

- $P=2.50$
- $C_v=0.90$
- $F=50{,}000$/month

Then:

$$
N_{BE}=\frac{50000}{2.50-0.90}=31{,}250\text{ runs/month}
$$

If cost amplification drives $k=1.6$:

$$
C_v'=1.44,
N_{BE}'=\frac{50000}{2.50-1.44}=47{,}170
$$

If optimization lowers to $k=0.8$:

$$
C_v'=0.72,
N_{BE}'=\frac{50000}{2.50-0.72}=28{,}090
$$

The spread between poor-control and optimized-control states is nearly 19k runs/month in break-even burden.

## Scaling projection implications

1. Tail-cost control matters as much as average-cost control.
2. Model routing and dedupe gains compound materially at high volume.
3. Without strict spend governance, volume growth can worsen margins instead of improving them.

## Area 8 verdict

- The platform can reach strong unit economics if loop amplification and model-routing inefficiencies are controlled.
- Scaling without hard spend controls creates significant margin compression risk.

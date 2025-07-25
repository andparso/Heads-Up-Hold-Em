# Heads‑Up Poker Trainer

This repository contains a simple heads‑up No‑Limit Texas Hold ’Em practice tool.  It is designed to help players train for heads‑up situations such as the World Series of Poker Main Event final table.  The application runs entirely in the browser and can be uploaded to GitHub or served locally (e.g. via GitHub Pages) and loaded on a mobile device.

## Features

* **Stack scenarios** – Choose between short, equal and big‑stack starting situations.
* **Opponent archetypes** – Select from five AI styles inspired by recent WSOP finalists: Aggressive Caller (Tamayo), Small‑ball Technician (Weinman), Tank Analyzer (Jorstad/Attenborough), Value Hunter (Aldemir) and Short‑Stack Gladiator (Salas).  Each opponent uses different opening frequencies and betting strategies.
* **Full dealing and betting structure** – The game deals random cards from a shuffled 52‑card deck, posts blinds, and supports betting on the pre‑flop, flop, turn and river.  Players can fold, check/call, go all in or choose a custom raise amount with a slider.
* **Chip and pot tracking** – Chip stacks for both players are shown in chip counts, percentage of total chips and big‑blind counts.  The pot size updates after each bet.
* **Hand analysis** – After each hand, the tool estimates your equity at each decision point via Monte Carlo simulation, evaluates whether your actions were +EV given pot odds, and comments on how well you disguised your hand.
* **End‑game screens** – A victory screen appears when you win all of the opponent’s chips; a defeat screen appears when you bust.

## How to Use

1. Open `index.html` in a modern browser (mobile or desktop).  No server is required.
2. On the **Setup Match** screen, choose a starting stack scenario and an opponent style.  Click **Start Match**.
3. Read the opponent profile and click **Continue to Deal** to begin.
4. During the hand, your hole cards are shown face up while your opponent’s cards remain hidden until showdown.  Use the action buttons to fold, check/call, go all in, or adjust the raise slider to select a raise amount and press **Raise**.
5. After each hand, a **Hand Analysis** panel appears summarising your decisions.  Click **Next Hand** to play again.
6. When either player loses all of their chips the game ends.  Click **Restart** to return to the setup screen.

## Notes and Limitations

* The equity calculator uses random sampling (Monte Carlo) to approximate winning chances.  While adequate for training, it may not perfectly match solver outputs.
* The AI opponents implement simplified decision trees rather than true GTO play.  They are intended to capture tendencies observed in recent WSOP heads‑up matches and to provide variety.
* The interface favours functionality over graphics.  Feel free to enhance the CSS or add card images.

## Running on Mobile

To play on your phone, upload the `wsop_heads_up_game` folder to a GitHub repository and enable GitHub Pages (or host the files via any static web host).  Then open the URL in your mobile browser.  All logic runs client‑side; no backend is required.

## License

This project is provided for educational purposes.  Use it freely to practice your heads‑up poker skills!

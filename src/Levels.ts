export default class Levels {
  public layout;
  public filemap;
  public indexmap;
  public numBalls: any[];
  public shapeData: any[];

  constructor() {
    this.filemap = {
      circle: 'objects/circle.png',
      square: 'objects/square.png',
      triangle: 'objects/triangle.png',
      base: 'kitties/kitty_base.png',
      panda: 'kitties/kitty_panda.png',
      tiger: 'kitties/kitty_tiger.png',
      alien: 'kitties/kitty_alien.png',
      astronaut: 'kitties/kitty_astronaut.png',
      bear: 'kitties/kitty_bear_pink.png',
      bob: 'kitties/kitty_bob_bow.png',
      cactus: 'kitties/kitty_cactus.png',
      clown: 'kitties/kitty_clown.png',
      cow: 'kitties/kitty_cow.png',
      flapper: 'kitties/kitty_flapper_wink.png',
      helmet: 'kitties/kitty_helmet.png',
      frog: 'kitties/kitty_kerropi.png',
      leopard: 'kitties/kitty_leopard.png',
      newsboy: 'kitties/kitty_newsboy.png',
      angry_panda: 'kitties/kitty_panda_angry.png',
      performer: 'kitties/kitty_performer.png',
      pig: 'kitties/kitty_pig.png',
      ponytail: 'kitties/kitty_ponytail.png',
      princess: 'kitties/kitty_pincess.png',
      puppy: 'kitties/kitty_puppy.png',
      sick: 'kitties/kitty_sick.png',
      tophat: 'kitties/kitty_top_hat.png',
    }

    this.indexmap = {
      circle: 0,
      square: 1,
      triangle: 2,
      base: 3,
      panda: 4,
      tiger: 5,
      alien: 6,
      astronaut: 7,
      bear: 8,
      bob: 9,
      cactus: 10,
      clown: 11,
      cow: 12,
      flapper: 13,
      helmet: 14,
      frog: 15,
      leopard: 16,
      newsboy: 17,
      angry_panda: 18,
      performer: 19,
      pig: 20,
      ponytail: 21,
      princess: 22,
      puppy: 23,
      sick: 24,
      tophat: 25,
    }

    this.shapeData = [
      { name: 'circle', cor: .7, pop: .1 },
      { name: 'square', cor: .7, pop: .1 },
      { name: 'triangle', cor: .7, pop: .1 },
      { name: 'base', cor: .7, pop: .1 },
      { name: 'panda', cor: .7, pop: .1 },
      { name: 'tiger', cor: .7, pop: .1 },
      { name: 'alien', cor: .7, pop: .1 },
      { name: 'astronaut', cor: .7, pop: .1 },
      { name: 'bear', cor: .7, pop: .1 },
      { name: 'bob', cor: .7, pop: .1 },
      { name: 'cactus', cor: .7, pop: .1 },
      { name: 'clown', cor: .7, pop: .1 },
      { name: 'cow', cor: .7, pop: .1 },
      { name: 'flapper', cor: .7, pop: .1 },
      { name: 'helmet', cor: .7, pop: .1 },
      { name: 'frog', cor: .7, pop: .1 },
      { name: 'leopard', cor: .7, pop: .1 },
      { name: 'newsboy', cor: .7, pop: .1 },
      { name: 'angry_panda', cor: .7, pop: .1 },
      { name: 'performer', cor: .7, pop: .1 },
      { name: 'pig', cor: .7, pop: .1 },
      { name: 'ponytail', cor: .7, pop: .1 },
      { name: 'princess', cor: .7, pop: .1 },
      { name: 'puppy', cor: .7, pop: .1 },
      { name: 'sick', cor: .7, pop: .1 },
      { name: 'tophat', cor: .7, pop: .1 },
    ];

    // level data

    // for even lines...
    //  column can be 0 to 5
    // for odd lines
    //  column can be 0 to 4
    // angle should be an integer -3 to 3 (usually)

    this.layout = [
      [
        { line: 1, column: 0, type: 'triangle', points: 15, angle: 3, opacity: .75, secondary: 'cow' },
        { line: 3, column: 4, type: 'triangle', points: 10, angle: -6, opacity: .75, secondary: 'puppy' },
        { line: 4, column: 0, type: 'triangle', points: 10, angle: -3, opacity: 1 },
        { line: 4, column: 2, type: 'square', points: 10, angle: -5, opacity: .75, secondary: 'pig' },
        { line: 4, column: 0, type: 'triangle', points: 10, angle: -4, opacity: 1 },
        { line: 5, column: 1, type: 'base', points: 20, angle: 0, opacity: 1 },
        { line: 6, column: 2, type: 'base', points: 20, angle: 0, opacity: 1 },
        { line: 7, column: 2, type: 'base', points: 20, angle: 0, opacity: 1 },
        { line: 8, column: 4, type: 'frog', points: 3, angle: 1, opacity: 1 },
        { line: 9, column: 4, type: 'frog', points: 5, angle: 1, opacity: 1 },
      ],
      [
        { line: 2, column: 0, type: 'base', points: 20, angle: -3, opacity: 1 },
        { line: 2, column: 4, type: 'frog', points: 2, angle: 1, opacity: 1 },
        { line: 4, column: 0, type: 'tiger', points: 20, angle: -1, opacity: 1 },
        { line: 5, column: 0, type: 'performer', points: 10, angle: -1, opacity: 1 },
        { line: 6, column: 1, type: 'clown', points: 100, angle: 1, opacity: 1 },
        { line: 11, column: 0, type: 'astronaut', points: 25, angle: 2, opacity: 1 },
        { line: 11, column: 1, type: 'astronaut', points: 25, angle: 0, opacity: 1 },
        { line: 11, column: 2, type: 'astronaut', points: 25, angle: 0, opacity: 1 },
        { line: 11, column: 3, type: 'astronaut', points: 25, angle: 0, opacity: 1 },
        { line: 11, column: 4, type: 'astronaut', points: 25, angle: 0, opacity: 1 },
        { line: 11, column: 5, type: 'astronaut', points: 25, angle: -2, opacity: 1 },
        { line: 13, column: 0, type: 'astronaut', points: 20, angle: -1, opacity: 1 },
        { line: 13, column: 1, type: 'astronaut', points: 20, angle: 1, opacity: 1 },
        { line: 13, column: 2, type: 'astronaut', points: 20, angle: 1, opacity: 1 },
        { line: 13, column: 3, type: 'astronaut', points: 20, angle: 1, opacity: 1 },
        { line: 13, column: 4, type: 'astronaut', points: 20, angle: 1, opacity: 1 },
        { line: 13, column: 5, type: 'astronaut', points: 20, angle: -1, opacity: 1 },
        { line: 14, column: 0, type: 'frog', points: 25, angle: 1, opacity: 1 },
      ],
      [
        { line: 0, column: 4, type: 'bear', points: 90, angle: -1, opacity: 1 },
        { line: 1, column: 4, type: 'tophat', points: 100, angle: 1, opacity: 1 },
        { line: 6, column: 3, type: 'frog', points: 15, angle: 1, opacity: 1 },
      ],
      [
        { line: 0, column: 3, type: 'sick', points: 10, angle: -1, opacity: 1 },
        { line: 1, column: 3, type: 'pig', points: 20, angle: 0, opacity: 1 },
        { line: 2, column: 4, type: 'performer', points: 30, angle: -1, opacity: 1 },
        { line: 4, column: 4, type: 'clown', points: 100, angle: 1, opacity: 1 }
      ],
      [
        { line: 0, column: 0, type: 'newsboy', points: 10, angle: 0, opacity: 1 },
        { line: 0, column: 2, type: 'ponytail', points: 10, angle: 0, opacity: 1 },
        { line: 1, column: 0, type: 'newsboy', points: 20, angle: 0, opacity: 1 },
        { line: 1, column: 2, type: 'ponytail', points: 30, angle: 0, opacity: 1 },
        { line: 2, column: 0, type: 'newsboy', points: 40, angle: 0, opacity: 1 },
        { line: 2, column: 2, type: 'ponytail', points: 50, angle: 0, opacity: 1 }
      ],
    ];

    this.numBalls = [
      1,
      3,
      10,
      10,
      5,
    ];
  }



  public getData (level, line, column) {
    const d = this.layout[level];
    let result = null;
    for (let i = 0; i < d.length; i++) {
      if (d[i].line === line && d[i].column === column) {
        result = d[i];
      }
    }
    return result;
  }
}

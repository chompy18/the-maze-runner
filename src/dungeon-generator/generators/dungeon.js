const Generator = require('./generator');
const Corridor = require('../pieces/corridor');
const Room = require('../pieces/room');
const consts = require('../const');
const utils = require('../utils');
const _ = require('lodash');

class Dungeon extends Generator {

	constructor(options) {
		options = Object.assign({}, {
			"size": [1000, 1000],
			"rooms": {
				"initial": {
					"min_size": [3, 3],
					"max_size": [3, 3],
					"max_exits": 3
				},
				"any": {
					"min_size": [3, 3],
					"max_size": [3, 3],
					"max_exits": 3
				}
			},
			"max_corridor_length": 2,
			"min_corridor_length": 2,
			"corridor_density": 0,
			"symmetric_rooms": true,
			"interconnects": 1,
			"max_interconnect_length": 10,
			"room_count": 500
		}, options);

		super(options);

		this.sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
		this.reset();

		this.room_tags = Object.keys(this.rooms).filter(tag => (tag !== 'any' && tag !== 'initial'));

		for (let i = this.room_tags.length; i < this.room_count; i++) {
			this.room_tags.push('any');
		}

		this.insultRooms = [];

	}

	reset() {
		this.hash = [];
		this.insultRooms = [];
		for (let i = 1; i <= this.options.room_count; i++) {
			this.hash.push(_.sample(this.sample));
		}
		this.pDungeon = {
			hash: _.join(this.hash, ''),
			dungeon: {}
		};
		this.rooms = [];
		this.corridors = [];
		this.__resetNextPieceId__();
	}

	add_room(room, exit, add_to_room = null) {
		let g_add_to_room = add_to_room;
		//add a new piece, exit is local perimeter pos for that exit;
		let choices, old_room, i = 0;
		while (true) {
			//pick a placed room to connect this piece to
			if (add_to_room) {
				old_room = add_to_room;
				add_to_room = null;
			} else {
				choices = this.get_open_pieces(this.children);
				if (choices && choices.length) {
					old_room = this.random.choose(choices);
				} else {
					console.log('ran out of choices connecting');
					break;
				}
			}

			//if exit is specified, try joining  to this specific exit
			if (exit) {
				//try joining the rooms
				if (this.join(old_room, exit, room)) {
					return true;
				}
				//else try all perims to see
			} else {
				let perim = room.perimeter.slice();
				while (perim.length) {
					if (this.join(old_room, this.random.choose(perim, true), room)) {
						return true;
					}
				}
			}

			if (i++ === 100) {
				console.log('failed to connect 100 times :(', room, exit, g_add_to_room);
				return false;
			}
		}
	}

	new_corridor() {
		return new Corridor({
			length: this.random.int(this.min_corridor_length, this.max_corridor_length),
			facing: this.random.choose(consts.FACING)
		});
	}

	add_interconnect() {
		let perims = {},
			hash, exit, p;

		//hash all possible exits
		this.children.forEach(child => {
			if (child.exits.length < child.max_exits) {
				child.perimeter.forEach(exit => {
					p = child.parent_pos(exit[0]);
					hash = `${p[0]}_${p[1]}`;
					perims[hash] = [exit, child];
				});
			}
		});

		//search each room for a possible interconnect, backwards
		let room, mod, length, corridor, room2;
		for (let i = this.children.length - 1; i--; i >= 0) {
			room = this.children[i];

			//if room has exits available
			if (room.exits.length < room.max_exits) {

				//iterate exits
				for (let k = 0; k < room.perimeter.length; k++) {
					exit = room.perimeter[k];
					p = room.parent_pos(exit[0]);
					length = -1;

					//try to dig a tunnel from this exit and see if it hits anything
					while (length <= this.max_interconnect_length) {
						//check if space is not occupied
						if (!this.walls.get(p) || !this.walls.get(utils.shift_left(p, exit[1])) || !this.walls.get(utils.shift_right(p, exit[1]))) {
							break;
						}
						hash = `${p[0]}_${p[1]}`;

						//is there a potential exit at these coordiantes (not of the same room)
						if (perims[hash] && perims[hash][1].id !== room.id) {
							room2 = perims[hash][1];

							//rooms cant be joined directly, add a corridor
							if (length > -1) {
								corridor = new Corridor({
									length,
									facing: exit[1]
								});

								if (this.join(room, corridor.perimeter[0], corridor, exit)) {
									this.join_exits(room2, perims[hash][0], corridor, corridor.perimeter[corridor.perimeter.length - 1]);
									return true;
								} else {
									return false;
								}
								//rooms can be joined directly
							} else {
								this.join_exits(room2, perims[hash][0], room, exit);
								return true;
							}
						}

						//exit not found, try to make the interconnect longer
						p = utils.shift(p, exit[1]);
						length++;
					}
				}
			}
		}
	}

	new_room(key) {
		//spawn next room
		key = key || this.random.choose(this.room_tags, false);

		let opts = this.options.rooms[key];
		const tikalTag = this.hash.shift();

		let room = new Room({
			size: this.random.vec(opts.min_size, opts.max_size),
			max_exits: opts.max_exits,
			symmetric: this.symmetric_rooms,
			tag: key,
			tikalTag: tikalTag,
		});

		if (_.includes(this.itemRoomIds, room.id)) {
			let item = this.getRoomItem();

			if (item && item.encoding) {
				let descStr = JSON.stringify({description: {hashLetter: tikalTag}});
				let encoded = Buffer.from(descStr, 'utf8');
				item.action = encoded.toString(item.encoding);
			}

			room.item = item;
		}

		if (room.item && room.item.questId === consts.QUESTS.INSULT_QUEST) {
			this.insultRooms.push(room);
		}

		this.room_tags.splice(this.room_tags.indexOf(key), 1);

		if (key === 'initial') {
			this.initial_room = room;
		}
		return room;
	}

	persistRoom(room) {
		let proom = {
			id: room.id,
			size: room.size,
			position: room.position,
			tikalTag: room.options.tikalTag,
			item: room.item,
			exits: []
		};

		for (let exit of room.exits) {
			proom.exits.push({
				direction: exit[1],
				targetRoomId: exit[2].id
			})
		}

		return proom;
	}

	persist() {
		this.children.map((room) => {
			this.pDungeon.dungeon[room.id] = this.persistRoom(room);
		});

		this.pDungeon.dungeon.items = [];

		return this.pDungeon;
	}

	assignInsultItems() {
		let currRoom = _.find(this.insultRooms, (o) => {
			return o.item.startOfQuest;
		});
		_.pull(this.insultRooms, currRoom);
		currRoom.item.action = _.pullAt(this.insults, this.random.int(0, this.insults.length - 1))[0].insult;
		let room;

		while (!currRoom.item.endOfQuest) {
			room = _.find(this.insultRooms, (o) => {
				return o.item.prereqObj.prereqId === currRoom.item.itemId;
			});

			if (room.item.endOfQuest) {
				room.item.action = this.queenInsults[0].insult;
				room.item.step = 0;
				room.item.queenInsults = this.queenInsults;
			} else {
				room.item.action = _.pullAt(this.insults, this.random.int(0, this.insults.length - 1))[0].insult;
				room.item.actionPrereqNotMet = `You should first learn the insult in room ${currRoom.id}.`;
			}

			currRoom = room;
		}

	}

	persistAndReset() {
		this.assignInsultItems();
		let persistedDungeon = this.persist();
		this.reset();
		return persistedDungeon;
	}

	getRoomItem() {
		let item;
		if (this.quests.length) {
			// first get random endOfQuest=true item
			let items = _.filter(this.quests, {'endOfQuest': true});

			if (!items.length) {
				// then get items with prereq
				items = _.filter(this.quests, (o) => {
					return o.hasOwnProperty('prereqObj')
				});
			}

			if (!items.length) {
				// then get item at random from what is left
				items = this.quests;
			}

			if (items.length) {
				item = _.sample(items);
				_.pull(this.quests, item);
			}

		}
		return item;
	}

	generate(quests, insults) {
		let no_rooms = this.options.room_count - 1;
		this.quests = quests;
		this.insults = insults;
		this.queenInsults = _.shuffle(insults);
		//todo: use _.random
		this.itemRoomIds = _.sampleSize(_.range(1, no_rooms - 1), quests.length);

		let room = this.new_room(this.options.rooms.initial ? 'initial' : undefined);
		let no_corridors = Math.round(this.corridor_density * no_rooms);

		this.add_piece(room, this.options.rooms.initial && this.options.rooms.initial.position ? this.options.rooms.initial.position : this.get_center_pos());
		this.rooms.push(room);
		let k;

		while (no_corridors || no_rooms) {
			k = this.random.int(1, no_rooms + no_corridors);
			if (k <= no_corridors) {
				let corridor = this.new_corridor();
				let added = this.add_room(corridor, corridor.perimeter[0]);
				no_corridors--;

				//try to connect to this corridor next
				if (no_rooms > 0 && added) {
					this.add_room(this.new_room(), null, corridor);
					no_rooms--;
				}

			} else {
				this.add_room(this.new_room());
				no_rooms--;
			}
		}

		for (k = 0; k < this.interconnects; k++) {
			this.add_interconnect();
		}

		this.trim();

		if (this.initial_room) {
			this.start_pos = this.initial_room.global_pos(this.initial_room.get_center_pos());
		}

		return this;
	}
}

module.exports = Dungeon;
/**
 * asset api
 */
// modules
const fs = require("fs");
const path = require("path");
// vars
const folder = path.join(__dirname, "../", process.env.ASSET_FOLDER);
// stuff
const database = require("../utils/database"), DB = new database();
const fUtil = require("../utils/fileUtil");

module.exports = {
	/**
	 * Deletes an asset.
	 * @param {string} id 
	 */
	delete(id) {
		// remove info from database
		const db = DB.get();
		const index = this.getIndex(id);
		db.assets.splice(index, 1);
		DB.save(db);

		// ugh
		const { type, subtype } = db.assets[index];
		if (type == "char") id += ".xml";

		// delete the actual file
		fs.unlinkSync(path.join(folder, id));

		// delete video and char thumbnails
		if (
			type == "char" ||
			subtype == "video"
		) {
			const thumbId = id.slice(0, -3) + "png";
			fs.unlinkSync(path.join(folder, thumbId));
		}
	},

	/**
	 * Gets a list of assets from the database, and filters it.
	 * @param {object} filters
	 * @returns {object[]}
	 */
	list(filters = {}) { // very simple thanks to the database
		const list = DB.get().assets;
		const filtered = list.filter((val) => {
			for (const [key, value] of Object.entries(filters)) {
				if (val[key] && val[key] != value) {
					return false;
				}
			}
			return true;
		});
		return filtered;
	},

	/**
	 * Looks for a match in the _ASSETS folder and returns the file buffer.
	 * If there's no match found, it returns null.
	 * @param {string} aId 
	 * @returns {fs.ReadStream}
	 */
	load(id) {
		if (this.exists(id)) {
			const filepath = path.join(folder, id);
			const readStream = fs.createReadStream(filepath);

			return readStream;
		} else {
			throw new Error("Asset doesn't exist.");
		}
	},

	/**
	 * Checks if the file exists.
	 * @param {string} aId 
	 * @returns {boolean}
	 */
	exists(aId) {
		const filepath = path.join(folder, aId);
		const exists = fs.existsSync(filepath);
		return exists;
	},

	/**
	 * Returns asset metadata from the database.
	 * @param {string} aId 
	 * @returns {object}
	 */
	get(aId) {
		const db = DB.get();
		const meta = db.assets.find((i) => (
			i.id == aId
		));
		
		if (!meta) {
			throw new Error("Asset doesn't exist.");
		}

		return meta;
	},

	/**
	 * Returns asset metadata from the database.
	 * @param {string} aId 
	 * @returns {number}
	 */
	getIndex(aId) {
		const db = DB.get();
		const meta = db.assets.findIndex((i) => (
			i.id == aId
		));
		
		if (!meta) {
			throw new Error("Asset doesn't exist.");
		}

		return meta;
	},

	/**
	 * Converts an object to a metadata XML.
	 * @param {any[]} v 
	 * @returns {string}
	 */
	meta2Xml(v) {
		let xml;
		switch (v.type) {
			case "char": {
				xml = `<char id="${v.id}" enc_asset_id="${v.id}" name="${v.title || "Untitled"}" cc_theme_id="${v.themeId}" thumbnail_url="/assets/${v.id}.png" copyable="Y"><tags>${v.tags || ""}</tags></char>`;
				break;
			} case "bg": {
				xml = `<background subtype="0" id="${v.id}" enc_asset_id="${v.id}" name="${v.title}" enable="Y" asset_url="/assets/${v.id}"/>`
				break;
			} case "movie": {
				xml = `<movie id="${v.id}" enc_asset_id="${v.id}" path="/_SAVED/${v.id}" numScene="${v.sceneCount}" title="${v.title}" thumbnail_url="/file/movie/thumb/${v.id}"><tags></tags></movie>`;
				break;
			} case "prop": {
				if (v.subtype == "video") {
					xml = `<prop subtype="video" id="${v.id}" enc_asset_id="${v.id}" name="${v.title}" enable="Y" placeable="1" facing="left" width="${v.width}" height="${v.height}" asset_url="/assets/${v.id}" thumbnail_url="/assets/${v.id.slice(0, -3) + "png"}"/>`;
				} else {
					xml = `<prop subtype="0" id="${v.id}" enc_asset_id="${v.id}" name="${v.title}" enable="Y" ${v.ptype}="1" facing="left" width="0" height="0" asset_url="/assets/${v.id}"/>`;
				}
				break;
			} case "sound": {
				xml = `<sound subtype="${v.subtype}" id="${v.id}" enc_asset_id="${v.id}" name="${v.title}" enable="Y" duration="${v.duration}" downloadtype="progressive"/>`;
				break;
			}
		}
		return xml;
	},

	/**
	 * Saves an asset.
	 * @param {fs.ReadStream} readStream 
	 * @param {string} ext
	 * @param {object} info 
	 * @returns {string}
	 */
	save(readStream, ext, info) {
		return new Promise((res, rej) => {
			const db = DB.get();
			info.id = `${fUtil.generateId()}.${ext}`;
			db.assets.unshift(info);
			DB.save(db);
			// save the file
			let writeStream = fs.createWriteStream(path.join(folder, info.id));
			readStream.resume();
			readStream.pipe(writeStream);
			// wait for the stream to end
			readStream.on("end", () => res(info.id));
		});
	},

	/**
	 * Updates an asset's info.
	 * It cannot replace the asset itself.
	 * @param {string} aId 
	 * @param {object} info 
	 * @returns {void}
	 */
	update(aId, info) {
		const db = DB.get();
		const index = this.getIndex(aId);
		Object.assign(db.assets[index], info);
		DB.save(db);
	}
};
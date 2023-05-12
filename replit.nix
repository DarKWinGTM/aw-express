{ pkgs }: {
	deps = [
    pkgs.lsof
    pkgs.nodejs-16_x
		pkgs.nodePackages.nodemon
	];
}

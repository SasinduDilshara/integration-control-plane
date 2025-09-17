import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  svg: {
    width: 'auto',
    height: 60,
  },
  hexagon: {
    fill: 'none',
    stroke: '#FF7300',
    strokeWidth: 6,
  },
  nodeGreen: {
    fill: '#7df3e1',
    stroke: '#fff',
    strokeWidth: 3,
  },
  nodeBlue: {
    fill: '#7df3e1',
    stroke: '#fff',
    strokeWidth: 3,
  },
  nodePurple: {
    fill: '#7df3e1',
    stroke: '#fff',
    strokeWidth: 3,
  },
  link: {
    stroke: '#999',
    strokeWidth: 5,
  },
  text: {
    fill: '#a9a3a3ff',
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    fontWeight: 'bold',
    fontSize: 30,
  },
});

const ICPLogo = () => {
  const classes = useStyles();

  return (
    <svg
      className={classes.svg}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 150"
    >
      {/* Hexagon base */}
      <polygon
        points="60,20 100,40 100,80 60,100 20,80 20,40"
        className={classes.hexagon}
      />

      {/* Links between nodes */}
      <line x1="60" y1="40" x2="40" y2="80" className={classes.link} />
      <line x1="60" y1="40" x2="80" y2="80" className={classes.link} />
      <line x1="40" y1="80" x2="80" y2="80" className={classes.link} />

      {/* Nodes */}
      <circle cx="60" cy="40" r="10" className={classes.nodeBlue} />
      <circle cx="40" cy="80" r="10" className={classes.nodeGreen} />
      <circle cx="80" cy="80" r="10" className={classes.nodePurple} />

      {/* Wordmark */}
      <text x="140" y="70" fontSize="28" className={classes.text}>
        WSO2 Integrator: ICP
      </text>
    </svg>
  );
};

export default ICPLogo;

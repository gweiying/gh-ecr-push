const { execSync } = require('child_process');
const core = require('@actions/core');

const AWS_ACCESS_KEY_ID = core.getInput('access-key-id', { required: true });
const AWS_SECRET_ACCESS_KEY = core.getInput('secret-access-key', { required: true });
const image = core.getInput('image', { required: true });
const localImage = core.getInput('local-image') || image;
const awsRegion = core.getInput('region') || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const direction = core.getInput('direction') || 'push';

function run(cmd, options = {}) {
    if (!options.hide) {
        console.log(`$ ${cmd}`);
    }
    return execSync(cmd, {
        shell: '/bin/bash',
        encoding: 'utf-8',
        env: {
            ...process.env,
            AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY,
        },
    });
}

const accountLoginPassword = `aws ecr get-login-password --region ${awsRegion}`;
const accountData = run(`aws sts get-caller-identity --output json --region ${awsRegion}`);
const awsAccountId = JSON.parse(accountData).Account;

let imageUrl;

run(
    `${accountLoginPassword} | docker login --username AWS --password-stdin ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com`
);

if (direction === 'push') {
    console.log(`Pushing local image ${localImage} to ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image}`);
    run(`docker tag ${localImage} ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image}`);
    run(`docker push ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image}`);
} else if (direction == 'pull') {
    console.log("Pulling ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image} to ${localImage}");
    run(`docker pull ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image}`);
    run(`docker tag ${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${image} ${localImage} `);
} else {
    throw new Error(`Unknown direction ${direction}`);
}
